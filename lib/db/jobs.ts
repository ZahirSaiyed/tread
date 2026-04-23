import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { Job, JobEvent, JobPhoto } from '@/types/domain'
import type { JobStatus } from '@/types/enums'

type Client = SupabaseClient<Database>

export interface ListJobsOptions {
  tenantId: string
  status?: JobStatus[]
  assignedTechId?: string
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
  if (opts.assignedTechId) {
    query = query.eq('assigned_tech_id', opts.assignedTechId)
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
