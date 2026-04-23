'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTechJobDetailRealtime } from '@/hooks/useTechJobDetailRealtime'
import { directionsUrlForDevice, telUrl } from '@/lib/tech/jobActions'
import { jobFromRealtimeRow } from '@/lib/tech/jobsDashboard'
import { hasCompletionPhotos } from '@/lib/tech/jobPhotos'
import { getNextStatusAction } from '@/lib/tech/jobStatusCta'
import { createClient } from '@/lib/supabase/client'
import type { JobDetail } from '@/types/api'
import type { Job } from '@/types/domain'
import type { JobStatus } from '@/types/enums'
import { JOB_STATUS_LABELS, SERVICE_TYPE_LABELS } from '@/types/enums'
import { JobPhotoSlots } from '@/components/tech/JobPhotoSlots'
import { JobStatusBar } from '@/components/tech/JobStatusBar'

function formatMoney(cents: number | null): string {
  if (cents == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function vehicleLine(job: Job): string | null {
  const parts = [job.vehicle_year, job.vehicle_make, job.vehicle_model].filter(Boolean)
  if (parts.length === 0) return null
  return parts.join(' ')
}

async function fetchDetail(jobId: string): Promise<JobDetail> {
  const res = await fetch(`/api/jobs/${jobId}`)
  const body = (await res.json()) as JobDetail & { error?: string }
  if (!res.ok) {
    throw new Error('error' in body ? body.error : 'Failed to load job')
  }
  return body as JobDetail
}

async function patchStatus(
  jobId: string,
  body: { status: JobStatus; cancellation_reason?: string },
): Promise<Job> {
  const res = await fetch(`/api/jobs/${jobId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as Job & { error?: string }
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Update failed')
  }
  return data as Job
}

export function TechJobDetail({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [detail, setDetail] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [techUserId, setTechUserId] = useState<string | null>(null)
  const [mapsHref, setMapsHref] = useState('#')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [statusBusy, setStatusBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const d = await fetchDetail(jobId)
      setDetail(d)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load job'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    const client = createClient()
    void client.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled && user?.id) setTechUserId(user.id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const onRealtime = useCallback(
    (row: Record<string, unknown>) => {
      const merged = jobFromRealtimeRow(row)
      if (!merged || merged.id !== jobId) return
      if (techUserId && merged.assigned_tech_id !== techUserId) {
        toast.error('This job was reassigned')
        router.push('/jobs')
        return
      }
      setDetail((d) =>
        d
          ? {
              ...d,
              ...merged,
              events: d.events,
              photos: d.photos,
            }
          : d,
      )
    },
    [jobId, techUserId, router],
  )

  useTechJobDetailRealtime(jobId, onRealtime)

  useLayoutEffect(() => {
    if (!detail?.address) return
    setMapsHref(directionsUrlForDevice(detail.address))
  }, [detail?.address])

  const applyNextStatus = async () => {
    if (!detail) return
    const action = getNextStatusAction(detail.status)
    if (!action) return
    if (action.target === 'complete' && !hasCompletionPhotos(detail.photos)) {
      toast.error('Add before, during, and after photos first.')
      return
    }
    const prev = detail
    setStatusBusy(true)
    setDetail((d) => (d ? { ...d, status: action.target } : d))
    try {
      const updated = await patchStatus(jobId, { status: action.target })
      setDetail((d) =>
        d
          ? {
              ...d,
              ...updated,
              events: d.events,
              photos: d.photos,
            }
          : d,
      )
      toast.success(`Status: ${JOB_STATUS_LABELS[action.target]}`)
    } catch (e) {
      setDetail(prev)
      toast.error(e instanceof Error ? e.message : 'Could not update status')
    } finally {
      setStatusBusy(false)
    }
  }

  const submitCancel = async () => {
    if (!detail) return
    const reason = cancelReason.trim()
    if (reason.length < 1) {
      toast.error('Please enter a cancellation reason')
      return
    }
    const prev = detail
    setStatusBusy(true)
    setDetail((d) => (d ? { ...d, status: 'cancelled' } : d))
    try {
      const updated = await patchStatus(jobId, { status: 'cancelled', cancellation_reason: reason })
      setDetail((d) =>
        d
          ? {
              ...d,
              ...updated,
              events: d.events,
              photos: d.photos,
            }
          : d,
      )
      setCancelOpen(false)
      setCancelReason('')
      toast.success('Job cancelled')
    } catch (e) {
      setDetail(prev)
      toast.error(e instanceof Error ? e.message : 'Could not cancel')
    } finally {
      setStatusBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-28 space-y-4" aria-busy="true">
        <div className="h-6 w-32 rounded-lg bg-trs-slate animate-pulse" />
        <div className="h-40 rounded-2xl bg-trs-charcoal border border-trs-slate animate-pulse" />
        <div className="h-12 rounded-xl bg-trs-slate animate-pulse" />
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="px-4 pt-8 pb-28 text-center">
        <p className="text-[#8E8E93] mb-4">{error}</p>
        <Link
          href="/jobs"
          className="inline-block rounded-xl bg-trs-gold px-6 py-3 text-sm font-semibold text-black"
        >
          Back to jobs
        </Link>
      </div>
    )
  }

  if (!detail) return null

  const job = detail
  const nextAction = getNextStatusAction(job.status)
  const vehicle = vehicleLine(job)
  const serviceLabel = SERVICE_TYPE_LABELS[job.service_type] ?? job.service_type
  const statusLabel = JOB_STATUS_LABELS[job.status]
  const photosReady = hasCompletionPhotos(job.photos)
  const completeBlocked =
    job.status === 'on_site' && nextAction?.target === 'complete' && !photosReady

  return (
    <div className="flex flex-col min-h-0 flex-1 pb-28">
      <div className="px-4 pt-3 pb-2 flex items-center gap-3 border-b border-trs-slate/80">
        <Link href="/jobs" className="text-sm text-trs-gold font-medium hover:underline">
          ← My jobs
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-5">
        <header>
          <p className="text-xs font-semibold tracking-wide text-[#8E8E93] uppercase">{statusLabel}</p>
          <h1 className="font-display text-2xl font-bold text-white mt-1">{job.customer_name}</h1>
          <p className="text-sm text-trs-gold mt-1">{serviceLabel}</p>
        </header>

        <JobStatusBar status={job.status} />

        <section className="rounded-2xl border border-trs-slate bg-trs-charcoal p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wide">Customer</h2>
          <p className="text-base text-white">{job.customer_phone}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-touch items-center justify-center rounded-xl bg-trs-slate px-4 text-sm font-medium text-white hover:bg-trs-gold/20 hover:text-trs-gold transition-colors"
            >
              Get Directions
            </a>
            <a
              href={telUrl(job.customer_phone)}
              className="inline-flex min-h-touch items-center justify-center rounded-xl bg-trs-gold px-4 text-sm font-semibold text-black hover:bg-trs-gold-dark transition-colors"
            >
              Call Customer
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-trs-slate bg-trs-charcoal p-4 space-y-2">
          <h2 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wide">Location</h2>
          <p className="text-base text-white leading-relaxed">{job.address}</p>
        </section>

        <section className="rounded-2xl border border-trs-slate bg-trs-charcoal p-4 space-y-2">
          <h2 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wide">Vehicle</h2>
          <p className="text-base text-white">{vehicle ?? '—'}</p>
        </section>

        <section className="rounded-2xl border border-trs-slate bg-trs-charcoal p-4 space-y-2">
          <h2 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wide">Price</h2>
          <p className="font-mono text-xl text-white tabular-nums">{formatMoney(job.price_cents)}</p>
        </section>

        {job.notes ? (
          <section className="rounded-2xl border border-trs-slate bg-trs-charcoal p-4 space-y-2">
            <h2 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wide">Notes</h2>
            <p className="text-sm text-[#E5E5EA] whitespace-pre-wrap">{job.notes}</p>
          </section>
        ) : null}

        <section className="rounded-2xl border border-trs-slate bg-trs-charcoal p-4 space-y-2">
          <h2 className="text-sm font-semibold text-[#8E8E93] uppercase tracking-wide">Times</h2>
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-[#8E8E93]">Requested</dt>
              <dd className="font-mono text-white tabular-nums text-right">{formatWhen(job.created_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-[#8E8E93]">Assigned</dt>
              <dd className="font-mono text-white tabular-nums text-right">{formatWhen(job.assigned_at)}</dd>
            </div>
          </dl>
        </section>

        <JobPhotoSlots
          jobId={job.id}
          tenantId={job.tenant_id}
          jobStatus={job.status}
          photos={job.photos}
          onUpdated={() => void load()}
        />

        <section className="space-y-3 pt-2">
          {nextAction && job.status !== 'cancelled' && job.status !== 'complete' ? (
            <>
              <button
                type="button"
                disabled={statusBusy || completeBlocked}
                onClick={() => void applyNextStatus()}
                className="w-full min-h-touch rounded-xl bg-trs-gold px-4 py-3 text-base font-semibold text-black hover:bg-trs-gold-dark transition-colors disabled:opacity-40 disabled:pointer-events-none"
              >
                {statusBusy ? 'Saving…' : nextAction.label}
              </button>
              {completeBlocked ? (
                <p className="text-xs text-[#FF9F0A] text-center">Complete all three photos to finish.</p>
              ) : null}
            </>
          ) : null}

          {job.status !== 'cancelled' && job.status !== 'complete' ? (
            <button
              type="button"
              disabled={statusBusy}
              onClick={() => setCancelOpen(true)}
              className="w-full min-h-touch rounded-xl border border-[#48484A] px-4 py-3 text-sm font-medium text-[#8E8E93] hover:text-white hover:border-[#8E8E93] transition-colors"
            >
              Cancel job…
            </button>
          ) : null}
        </section>
      </div>

      {cancelOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-trs-slate bg-trs-charcoal p-4 shadow-xl">
            <h2 id="cancel-title" className="font-display text-lg font-semibold text-white">
              Cancel this job?
            </h2>
            <p className="text-sm text-[#8E8E93] mt-2">Dispatch will see your reason.</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Reason (required)"
              className="mt-3 w-full rounded-xl border border-trs-slate bg-[#000000] px-3 py-2 text-sm text-white placeholder:text-[#48484A] focus:border-trs-gold focus:outline-none"
            />
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setCancelOpen(false)
                  setCancelReason('')
                }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-[#8E8E93] hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                disabled={statusBusy}
                onClick={() => void submitCancel()}
                className="rounded-xl bg-[#FF3B30] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                Cancel job
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
