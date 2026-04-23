import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const TRS_TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

/** Stable UUIDs for idempotent dev seeding (do not collide with supabase/seed/004_sample_jobs.sql). */
const DEV_JOB_IDS = [
  'd1000000-0000-0000-0000-000000000001',
  'd1000000-0000-0000-0000-000000000002',
  'd1000000-0000-0000-0000-000000000003',
  'd1000000-0000-0000-0000-000000000004',
] as const

/**
 * POST /api/dev/seed-jobs
 * Creates sample jobs assigned to the dev tech so /jobs and /jobs/[id] are exercisable.
 * Requires: local Supabase + service role key + TRS tenant + at least one tech profile
 * (use /login DEV “Marcus” once to create marcus@trs.dev).
 */
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      {
        error: 'SUPABASE_SERVICE_ROLE_KEY is not set',
        hint: 'Add it to .env.local for local dev (Supabase project settings → API).',
      },
      { status: 500 },
    )
  }

  const admin = createServiceClient()

  const { data: marcus } = await admin
    .from('users')
    .select('id')
    .eq('tenant_id', TRS_TENANT_ID)
    .eq('email', 'marcus@trs.dev')
    .eq('role', 'tech')
    .maybeSingle()

  let techId = marcus?.id
  if (!techId) {
    const { data: fallback } = await admin
      .from('users')
      .select('id')
      .eq('tenant_id', TRS_TENANT_ID)
      .eq('role', 'tech')
      .limit(1)
      .maybeSingle()
    techId = fallback?.id
  }
  if (!techId) {
    return NextResponse.json(
      {
        error: 'No tech user found for TRS tenant',
        hint: 'On /login or /login-tech, use the DEV panel and click Marcus once (or create a tech in users). Then POST again.',
      },
      { status: 400 },
    )
  }

  const { error: tenantErr } = await admin.from('tenants').select('id').eq('id', TRS_TENANT_ID).single()
  if (tenantErr) {
    return NextResponse.json(
      {
        error: 'TRS tenant row missing',
        hint: 'Run supabase db reset --seed or apply supabase/seed/001_trs_tenant.sql, then npx supabase db push.',
      },
      { status: 500 },
    )
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const rows = [
    {
      id: DEV_JOB_IDS[0],
      tenant_id: TRS_TENANT_ID,
      customer_name: 'Dev — Assigned',
      customer_phone: '+17035551901',
      address: '4521 Dale Blvd, Dale City, VA 22193',
      lat: 38.6312,
      lng: -77.3441,
      vehicle_year: 2021,
      vehicle_make: 'Toyota',
      vehicle_model: 'Camry',
      service_type: 'tire_repair' as const,
      service_variant: 'plug' as string | null,
      status: 'assigned' as const,
      assigned_tech_id: techId,
      price_cents: 12_500,
      notes: 'Demo job: try Accept & roll → En route.',
      source: 'manual' as const,
      assigned_at: hourAgo,
      started_at: null,
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
    },
    {
      id: DEV_JOB_IDS[1],
      tenant_id: TRS_TENANT_ID,
      customer_name: 'Dev — En route',
      customer_phone: '+17035551902',
      address: '14300 Smoketown Rd, Woodbridge, VA 22192',
      lat: 38.6534,
      lng: -77.2692,
      vehicle_year: 2019,
      vehicle_make: 'Ford',
      vehicle_model: 'F-150',
      service_type: 'jumpstart' as const,
      service_variant: null,
      status: 'en_route' as const,
      assigned_tech_id: techId,
      price_cents: null,
      notes: 'Demo: mark On site, then add photos and Complete.',
      source: 'manual' as const,
      assigned_at: twoHoursAgo,
      started_at: hourAgo,
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
    },
    {
      id: DEV_JOB_IDS[2],
      tenant_id: TRS_TENANT_ID,
      customer_name: 'Dev — On site',
      customer_phone: '+17035551903',
      address: '2801 Centreville Rd, Herndon, VA 20171',
      lat: 38.9696,
      lng: -77.3855,
      vehicle_year: 2022,
      vehicle_make: 'Honda',
      vehicle_model: 'CR-V',
      service_type: 'mount_balance' as const,
      service_variant: 'stock' as string | null,
      status: 'on_site' as const,
      assigned_tech_id: techId,
      price_cents: 18_900,
      notes: 'Demo: upload Before / During / After, then Complete.',
      source: 'manual' as const,
      assigned_at: twoHoursAgo,
      started_at: hourAgo,
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
    },
    {
      id: DEV_JOB_IDS[3],
      tenant_id: TRS_TENANT_ID,
      customer_name: 'Dev — Pending assign',
      customer_phone: '+17035551904',
      address: '6600 Loisdale Rd, Springfield, VA 22150',
      lat: 38.7754,
      lng: -77.1789,
      vehicle_year: 2020,
      vehicle_make: 'Chevrolet',
      vehicle_model: 'Silverado',
      service_type: 'tire_rotation' as const,
      service_variant: null,
      status: 'pending' as const,
      assigned_tech_id: techId,
      price_cents: null,
      notes: 'Demo: status pending but already dispatched to you — tap Accept job.',
      source: 'manual' as const,
      assigned_at: null,
      started_at: null,
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
    },
  ]

  const { error: delErr } = await admin.from('jobs').delete().in('id', [...DEV_JOB_IDS])
  if (delErr) {
    return NextResponse.json({ error: delErr.message, code: delErr.code }, { status: 500 })
  }

  const { error } = await admin.from('jobs').insert(rows)
  if (error) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    assignedTechId: techId,
    jobIds: [...DEV_JOB_IDS],
    message: `Upserted ${rows.length} demo jobs assigned to this tenant’s tech. Open /jobs to refresh.`,
  })
}
