import type { Job } from '@/types/domain'
import type { JobStatus } from '@/types/enums'

export type TechJobsTab = 'all' | 'pending' | 'in_progress' | 'complete'

/** Tab labels match PRD SM 2.1; `pending` is literal job status. */
export const TECH_JOBS_TAB_LABELS: Record<TechJobsTab, string> = {
  all: 'All',
  pending: 'Pending',
  in_progress: 'In Progress',
  complete: 'Complete',
}

const IN_PROGRESS_STATUSES: JobStatus[] = ['assigned', 'en_route', 'on_site']

export function isSameLocalCalendarDay(iso: string, ref: Date = new Date()): boolean {
  const d = new Date(iso)
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  )
}

export function filterJobsByTab(jobs: Job[], tab: TechJobsTab): Job[] {
  switch (tab) {
    case 'all':
      return jobs
    case 'pending':
      return jobs.filter((j) => j.status === 'pending')
    case 'in_progress':
      return jobs.filter((j) => IN_PROGRESS_STATUSES.includes(j.status))
    case 'complete':
      return jobs.filter((j) => j.status === 'complete')
    default:
      return jobs
  }
}

export function filterJobsBySearch(jobs: Job[], query: string): Job[] {
  const q = query.trim().toLowerCase()
  if (!q) return jobs
  return jobs.filter(
    (j) =>
      j.customer_name.toLowerCase().includes(q) || j.address.toLowerCase().includes(q),
  )
}

export interface TechJobsMetrics {
  /** Jobs created local-today (assigned to this tech — caller passes scoped list). */
  createdToday: number
  /** Count with status `pending`. */
  pending: number
  /** Completed local-today. */
  doneToday: number
}

export function computeTechJobsMetrics(jobs: Job[], now: Date = new Date()): TechJobsMetrics {
  let createdToday = 0
  let pending = 0
  let doneToday = 0
  for (const j of jobs) {
    if (isSameLocalCalendarDay(j.created_at, now)) createdToday += 1
    if (j.status === 'pending') pending += 1
    if (j.status === 'complete' && j.completed_at && isSameLocalCalendarDay(j.completed_at, now)) {
      doneToday += 1
    }
  }
  return { createdToday, pending, doneToday }
}

/** Map a Realtime `new` payload to `Job` when all required fields are present. */
export function jobFromRealtimeRow(row: Record<string, unknown>): Job | null {
  const patch = rowToJobPatch(row)
  if (
    !patch.id ||
    !patch.tenant_id ||
    !patch.customer_name ||
    !patch.customer_phone ||
    !patch.address ||
    !patch.service_type ||
    !patch.status ||
    !patch.source ||
    !patch.tracking_token ||
    !patch.created_at
  ) {
    return null
  }
  return patch as Job
}

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  ) as Partial<T>
}

/** Apply postgres_changes `new` row into the in-memory list (RLS ensures tenant + assignment). */
export function mergeJobFromRealtime(prev: Job[], newRow: Record<string, unknown>): Job[] {
  const id = newRow.id
  if (typeof id !== 'string') return prev

  const idx = prev.findIndex((j) => j.id === id)
  const patch = omitUndefined(rowToJobPatch(newRow) as Record<string, unknown>) as Partial<Job>
  if (idx === -1) {
    const inserted = jobFromRealtimeRow(newRow)
    if (!inserted) return prev
    return [inserted, ...prev]
  }
  const next = [...prev]
  next[idx] = { ...next[idx], ...patch }
  return next
}

/** If the job is no longer assigned to this tech, drop it; otherwise merge `new` row. */
export function applyRealtimeJobsChange(
  prev: Job[],
  newRow: Record<string, unknown>,
  techUserId: string,
): Job[] {
  const id = newRow.id
  if (typeof id !== 'string') return prev
  const assigned = newRow.assigned_tech_id
  if (assigned !== techUserId) {
    return prev.filter((j) => j.id !== id)
  }
  return mergeJobFromRealtime(prev, newRow)
}

function rowToJobPatch(row: Record<string, unknown>): Partial<Job> {
  const pickStr = (k: string) => (typeof row[k] === 'string' ? (row[k] as string) : undefined)
  const pickStrNull = (k: string) => {
    const v = row[k]
    if (v === null) return null
    return typeof v === 'string' ? v : undefined
  }
  const pickNumNull = (k: string): number | null | undefined => {
    const v = row[k]
    if (v === null) return null
    if (v === undefined) return undefined
    if (typeof v === 'number' && !Number.isNaN(v)) return v
    if (typeof v === 'string' && v !== '') {
      const n = Number(v)
      return Number.isNaN(n) ? undefined : n
    }
    return undefined
  }

  const patch: Partial<Job> = {
    id: pickStr('id'),
    tenant_id: pickStr('tenant_id'),
    customer_name: pickStr('customer_name'),
    customer_phone: pickStr('customer_phone'),
    address: pickStr('address'),
    lat: pickNumNull('lat') as number | null | undefined,
    lng: pickNumNull('lng') as number | null | undefined,
    vehicle_year: pickNumNull('vehicle_year') as number | null | undefined,
    vehicle_make: pickStrNull('vehicle_make') as string | null | undefined,
    vehicle_model: pickStrNull('vehicle_model') as string | null | undefined,
    service_type: pickStr('service_type') as Job['service_type'] | undefined,
    service_variant: pickStrNull('service_variant') as Job['service_variant'] | null | undefined,
    status: pickStr('status') as Job['status'] | undefined,
    assigned_tech_id: pickStrNull('assigned_tech_id') as string | null | undefined,
    price_cents: pickNumNull('price_cents') as number | null | undefined,
    notes: pickStrNull('notes') as string | null | undefined,
    source: pickStr('source') as Job['source'] | undefined,
    tracking_token: pickStr('tracking_token'),
    tracking_expires_at: pickStrNull('tracking_expires_at') as string | null | undefined,
    created_at: pickStr('created_at'),
    assigned_at: pickStrNull('assigned_at') as string | null | undefined,
    started_at: pickStrNull('started_at') as string | null | undefined,
    completed_at: pickStrNull('completed_at') as string | null | undefined,
    cancelled_at: pickStrNull('cancelled_at') as string | null | undefined,
    cancellation_reason: pickStrNull('cancellation_reason') as string | null | undefined,
  }

  return patch
}

export function sortJobsForDashboard(jobs: Job[]): Job[] {
  return [...jobs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}
