import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { Job } from '@/types/domain'
import { SERVICE_TYPE_LABELS } from '@/types/enums'
import { getTwilioClient } from '@/lib/twilio/client'

// ─── Message composition ──────────────────────────────────────────────────────

export interface ComposeOptions {
  customerName: string
  techName: string | null | undefined
  serviceType: string
  trackingUrl: string
}

/**
 * Builds the personalized review-request SMS body.
 * Targets ≤ 2 segments (≤ 320 GSM-7 chars) for reliable delivery and cost.
 */
export function composeReviewSms({
  customerName,
  techName,
  serviceType,
  trackingUrl,
}: ComposeOptions): string {
  const firstName = customerName.trim().split(/\s+/)[0] || 'there'
  const serviceLabel = SERVICE_TYPE_LABELS[serviceType as keyof typeof SERVICE_TYPE_LABELS] ?? serviceType
  const techFirst = techName?.trim().split(/\s+/)[0]

  const intro = techFirst
    ? `Hi ${firstName}! ${techFirst} just completed your ${serviceLabel}.`
    : `Hi ${firstName}! Your ${serviceLabel} with TRS is complete.`

  return `${intro} Mind leaving us a quick review?\n${trackingUrl}\n– TRS Mobile Tire Shop`
}

// ─── Send review request ──────────────────────────────────────────────────────

export interface SendReviewRequestOptions {
  supabase: SupabaseClient<Database>
  job: Job
  tenantTwilioNumber: string | null
  googleReviewUrl: string | null
  appUrl: string
}

/**
 * Creates a review_request record and fires a personalized SMS.
 *
 * Guarantees:
 * - One review request per job (UNIQUE constraint + pre-check).
 * - Never throws — Twilio failures are logged, not propagated.
 * - If Twilio is unconfigured or googleReviewUrl is missing, the record is
 *   still created so the operator can see it was attempted.
 */
export async function sendReviewRequest({
  supabase,
  job,
  tenantTwilioNumber,
  googleReviewUrl,
  appUrl,
}: SendReviewRequestOptions): Promise<void> {
  // Guard: need a review destination
  if (!googleReviewUrl) {
    console.warn('[review-request] no google_review_url configured for tenant — skipping')
    return
  }

  // Deduplication: one request per job (enforced in DB too, but check first
  // to avoid wasting a Twilio send on a duplicate)
  const { data: existing } = await supabase
    .from('review_requests')
    .select('id')
    .eq('job_id', job.id)
    .maybeSingle()

  if (existing) {
    console.info('[review-request] already sent for job', job.id, '— skipping')
    return
  }

  // Create the record first so we have an ID for the tracking URL
  const { data: record, error: insertError } = await supabase
    .from('review_requests')
    .insert({
      tenant_id: job.tenant_id,
      job_id: job.id,
      customer_phone: job.customer_phone,
      review_url: googleReviewUrl,
    })
    .select('id')
    .single()

  if (insertError || !record) {
    console.error('[review-request] failed to insert record:', insertError)
    return
  }

  const trackingUrl = `${appUrl}/api/r/${record.id}`
  const body = composeReviewSms({
    customerName: job.customer_name,
    techName: job.assigned_tech?.name,
    serviceType: job.service_type,
    trackingUrl,
  })

  // SMS is best-effort — failures are logged but never propagated
  if (!tenantTwilioNumber) {
    console.warn('[review-request] no twilio_number on tenant — SMS skipped, record created:', record.id)
    return
  }

  const twilio = getTwilioClient()
  if (!twilio) {
    console.warn('[review-request] Twilio not configured (missing env vars) — SMS skipped, record created:', record.id)
    return
  }

  try {
    const message = await twilio.messages.create({
      from: tenantTwilioNumber,
      to: job.customer_phone,
      body,
    })

    await supabase
      .from('review_requests')
      .update({ twilio_sid: message.sid })
      .eq('id', record.id)

    console.info('[review-request] sent:', message.sid, 'for job', job.id)
  } catch (err) {
    console.error('[review-request] Twilio send failed for job', job.id, ':', err)
    // Record stays in DB without twilio_sid — operator can see it was attempted
  }
}
