import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/session'
import { listJobs } from '@/lib/db/jobs'
import { CreateJobSchema } from '@/lib/validators/job'
import { parseListJobsQuery } from '@/lib/validators/jobsListQuery'
import type { ApiError, PaginatedResponse } from '@/types/api'
import type { Job } from '@/types/domain'

// GET /api/jobs?status=pending,assigned&page=1&pageSize=20
export async function GET(request: NextRequest): Promise<NextResponse<PaginatedResponse<Job> | ApiError>> {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = parseListJobsQuery(request.nextUrl.searchParams)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }
  const q = parsed.data

  // Techs can only list their own jobs — enforce by overriding the filter
  const resolvedTechFilter = user.role === 'tech' ? user.id : q.assignedTechId
  const resolvedUnassigned =
    user.role === 'tech' ? undefined : q.unassignedOnly ? true : undefined

  try {
    const supabase = await createClient()
    const { data, count } = await listJobs(supabase, {
      tenantId: user.tenant_id,
      status: q.status,
      assignedTechId: resolvedTechFilter,
      unassignedOnly: resolvedUnassigned,
      serviceTypes: user.role === 'tech' ? undefined : q.serviceTypes,
      createdFromIso: user.role === 'tech' ? undefined : q.createdFromIso,
      createdToIso: user.role === 'tech' ? undefined : q.createdToIso,
      page: q.page,
      pageSize: q.pageSize,
    })

    return NextResponse.json({ data, count, page: q.page, pageSize: q.pageSize })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

// POST /api/jobs
export async function POST(request: NextRequest): Promise<NextResponse<Job | ApiError>> {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'tech') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = CreateJobSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.errors[0]?.message ?? 'Validation error' },
      { status: 400 },
    )
  }

  const input = result.data

  // Validate assigned_tech_id belongs to the same tenant (if provided)
  const supabase = await createClient()
  if (input.assigned_tech_id) {
    const { data: tech } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', input.assigned_tech_id)
      .eq('tenant_id', user.tenant_id)
      .eq('role', 'tech')
      .single()

    if (!tech) {
      return NextResponse.json({ error: 'Tech not found in this tenant' }, { status: 400 })
    }
  }

  const now = new Date().toISOString()
  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      tenant_id: user.tenant_id,
      customer_name: input.customer_name,
      customer_phone: input.customer_phone,
      address: input.address,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      vehicle_year: input.vehicle_year ?? null,
      vehicle_make: input.vehicle_make ?? null,
      vehicle_model: input.vehicle_model ?? null,
      service_type: input.service_type,
      service_variant: input.service_variant ?? null,
      vehicle_class: input.vehicle_class ?? null,
      location_type: input.location_type ?? null,
      price_cents: input.price_cents ?? null,
      notes: input.notes ?? null,
      source: input.source,
      assigned_tech_id: input.assigned_tech_id ?? null,
      status: input.assigned_tech_id ? 'assigned' : 'pending',
      assigned_at: input.assigned_tech_id ? now : null,
    })
    .select()
    .single()

  if (error) {
    console.error('[POST /api/jobs] insert error:', error)
    return NextResponse.json({ error: error.message ?? 'Failed to create job' }, { status: 500 })
  }

  // Append creation event
  await supabase.from('job_events').insert({
    job_id: job.id,
    tenant_id: user.tenant_id,
    event_type: 'job_created',
    payload: { source: input.source },
    created_by: user.id,
  })

  if (input.assigned_tech_id) {
    await supabase.from('job_events').insert({
      job_id: job.id,
      tenant_id: user.tenant_id,
      event_type: 'tech_assigned',
      payload: { tech_id: input.assigned_tech_id },
      created_by: user.id,
    })
  }

  return NextResponse.json(job as unknown as Job, { status: 201 })
}
