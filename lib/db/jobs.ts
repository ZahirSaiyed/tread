import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { Job, JobEvent, JobPhoto } from '@/types/domain'
import type { JobStatus, ServiceType } from '@/types/enums'

type Client = SupabaseClient<Database>

export interface ListJobsOptions {
  tenantId: string
  status?: JobStatus[]
  assignedTechId?: string
  /** When true, only jobs with no assigned tech (implies `assigned_tech_id` IS NULL). */
  unassignedOnly?: boolean
  serviceTypes?: ServiceType[]
  createdFromIso?: string
  createdToIso?: string
  page?: number
  pageSize?: number
}

export async function listJobs(
  client: Client,
  opts: ListJobsOptions,
): Promise<{ data: Job[]; count: number }> {
  const page = opts.page ?? 1
  const pageSize = Math.min(opts.pageSize ?? 20, 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = client
    .from('jobs')
    .select('*, assigned_tech:users!assigned_tech_id(id, name, phone, avatar_url)', {
      count: 'exact',
    })
    .eq('tenant_id', opts.tenantId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts.status?.length) {
    query = query.in('status', opts.status)
  }
  if (opts.unassignedOnly) {
    query = query.is('assigned_tech_id', null)
  } else if (opts.assignedTechId) {
    query = query.eq('assigned_tech_id', opts.assignedTechId)
  }
  if (opts.serviceTypes?.length) {
    query = query.in('service_type', opts.serviceTypes)
  }
  if (opts.createdFromIso) {
    query = query.gte('created_at', opts.createdFromIso)
  }
  if (opts.createdToIso) {
    query = query.lte('created_at', opts.createdToIso)
  }

  const { data, error, count } = await query

  if (error) throw error
  return { data: (data ?? []) as unknown as Job[], count: count ?? 0 }
}

export async function getJob(
  client: Client,
  jobId: string,
  tenantId: string,
): Promise<Job | null> {
  const { data, error } = await client
    .from('jobs')
    .select('*, assigned_tech:users!assigned_tech_id(id, name, phone, avatar_url)')
    .eq('id', jobId)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // not found
    throw error
  }
  return data as unknown as Job
}

export async function getJobEvents(
  client: Client,
  jobId: string,
): Promise<JobEvent[]> {
  const { data, error } = await client
    .from('job_events')
    .select('*, created_by_user:users!created_by(id, name)')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as JobEvent[]
}

export async function getJobPhotos(
  client: Client,
  jobId: string,
): Promise<JobPhoto[]> {
  const { data, error } = await client
    .from('job_photos')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as JobPhoto[]
}

// Timestamp column to set for each terminal status
const STATUS_TIMESTAMPS: Partial<Record<JobStatus, string>> = {
  assigned:  'assigned_at',
  en_route:  'started_at',
  complete:  'completed_at',
  cancelled: 'cancelled_at',
}

export interface UpdateStatusOptions {
  jobId: string
  tenantId: string
  /** Status before this update (for job_events audit). */
  previousStatus: JobStatus
  newStatus: JobStatus
  cancellationReason?: string
  updatedBy: string
}

export async function updateJobStatus(
  client: Client,
  opts: UpdateStatusOptions,
): Promise<Job> {
  const now = new Date().toISOString()
  const tsColumn = STATUS_TIMESTAMPS[opts.newStatus]

  const patch: Record<string, unknown> = { status: opts.newStatus }
  if (tsColumn) patch[tsColumn] = now
  if (opts.newStatus === 'cancelled' && opts.cancellationReason) {
    patch['cancellation_reason'] = opts.cancellationReason
  }

  const { data: job, error } = await client
    .from('jobs')
    .update(patch)
    .eq('id', opts.jobId)
    .eq('tenant_id', opts.tenantId)
    .select()
    .single()

  if (error) throw error

  await appendJobEvent(client, {
    jobId: opts.jobId,
    tenantId: opts.tenantId,
    eventType: 'status_changed',
    payload: {
      from: opts.previousStatus,
      to: opts.newStatus,
      ...(opts.cancellationReason ? { reason: opts.cancellationReason } : {}),
    },
    createdBy: opts.updatedBy,
  })

  return job as unknown as Job
}

export interface AssignTechOptions {
  jobId: string
  tenantId: string
  techId: string
  assignedBy: string
}

export async function assignTech(
  client: Client,
  opts: AssignTechOptions,
): Promise<Job> {
  const { data: job, error } = await client
    .from('jobs')
    .update({
      assigned_tech_id: opts.techId,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    })
    .eq('id', opts.jobId)
    .eq('tenant_id', opts.tenantId)
    .select()
    .single()

  if (error) throw error

  await appendJobEvent(client, {
    jobId: opts.jobId,
    tenantId: opts.tenantId,
    eventType: 'tech_assigned',
    payload: { tech_id: opts.techId },
    createdBy: opts.assignedBy,
  })

  return job as unknown as Job
}

interface AppendEventOptions {
  jobId: string
  tenantId: string
  eventType: string
  payload: Record<string, unknown>
  createdBy: string | null
}

async function appendJobEvent(client: Client, opts: AppendEventOptions) {
  const { error } = await client.from('job_events').insert({
    job_id: opts.jobId,
    tenant_id: opts.tenantId,
    event_type: opts.eventType,
    payload: opts.payload,
    created_by: opts.createdBy,
  })
  if (error) throw error
}

const EDITABLE_PRE_DISPATCH_STATUSES: JobStatus[] = ['pending', 'assigned']

export interface UpdateJobOperatorFieldsOptions {
  jobId: string
  tenantId: string
  /** Columns allowed on `jobs` (validated by API). */
  patch: Record<string, unknown>
  updatedBy: string
}

/** Operator-only field updates while job is still pending or assigned (not yet en route). */
export async function updateJobOperatorFields(
  client: Client,
  opts: UpdateJobOperatorFieldsOptions,
): Promise<Job> {
  const { data: current, error: readErr } = await client
    .from('jobs')
    .select('status')
    .eq('id', opts.jobId)
    .eq('tenant_id', opts.tenantId)
    .single()

  if (readErr) {
    if (readErr.code === 'PGRST116') {
      const err = new Error('JOB_NOT_FOUND')
      ;(err as Error & { code?: string }).code = 'JOB_NOT_FOUND'
      throw err
    }
    throw readErr
  }
  const st = current?.status as JobStatus | undefined
  if (!st || !EDITABLE_PRE_DISPATCH_STATUSES.includes(st)) {
    const err = new Error('JOB_NOT_EDITABLE')
    ;(err as Error & { code?: string }).code = 'JOB_NOT_EDITABLE'
    throw err
  }

  const { data: job, error } = await client
    .from('jobs')
    .update(opts.patch)
    .eq('id', opts.jobId)
    .eq('tenant_id', opts.tenantId)
    .select()
    .single()

  if (error) throw error

  await appendJobEvent(client, {
    jobId: opts.jobId,
    tenantId: opts.tenantId,
    eventType: 'job_updated',
    payload: { fields: Object.keys(opts.patch) },
    createdBy: opts.updatedBy,
  })

  return job as unknown as Job
}

export interface RevenueAggregateOptions {
  tenantId: string
  completedFromIso: string
  completedToIso: string
}

/** Sum `price_cents` for completed jobs in range (inclusive). Null prices treated as 0. */
export async function aggregateCompletedRevenue(
  client: Client,
  opts: RevenueAggregateOptions,
): Promise<{ totalCents: number; jobCount: number }> {
  const { data, error } = await client
    .from('jobs')
    .select('price_cents')
    .eq('tenant_id', opts.tenantId)
    .eq('status', 'complete')
    .not('completed_at', 'is', null)
    .gte('completed_at', opts.completedFromIso)
    .lte('completed_at', opts.completedToIso)

  if (error) throw error
  const rows = data ?? []
  let totalCents = 0
  for (const row of rows) {
    const n = row.price_cents
    if (typeof n === 'number' && !Number.isNaN(n)) totalCents += n
  }
  return { totalCents, jobCount: rows.length }
}
