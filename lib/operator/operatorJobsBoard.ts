import { mergeJobFromRealtime } from '@/lib/tech/jobsDashboard'
import type { Job } from '@/types/domain'
import type { JobStatus } from '@/types/enums'

const ACTIVE_STATUSES: JobStatus[] = ['assigned', 'en_route', 'on_site']

export type TechPresenceKind = 'idle' | 'dispatched' | 'en_route' | 'on_site'

/** Merge Realtime `jobs` row into tenant-scoped list (never drops on reassignment). */
export function applyOperatorRealtimeJobsChange(
  prev: Job[],
  newRow: Record<string, unknown>,
  tenantId: string,
): Job[] {
  const rowTenant = newRow.tenant_id
  if (typeof rowTenant === 'string' && rowTenant !== tenantId) {
    return prev
  }
  return mergeJobFromRealtime(prev, newRow)
}

export function filterUnassignedJobs(jobs: Job[]): Job[] {
  return jobs.filter((j) => j.status === 'pending' && j.assigned_tech_id == null)
}

/** Oldest first (FIFO queue). */
export function sortUnassignedQueueOldestFirst(jobs: Job[]): Job[] {
  return [...filterUnassignedJobs(jobs)].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
}

function statusRank(status: JobStatus): number {
  if (status === 'on_site') return 3
  if (status === 'en_route') return 2
  if (status === 'assigned') return 1
  return 0
}

function activityTimestamp(job: Job): number {
  const iso = job.started_at ?? job.assigned_at ?? job.created_at
  return new Date(iso).getTime()
}

/** Active job for a tech, or null. Tie-break: higher activity status, then most recent timestamps. */
export function pickActiveJobForTech(techId: string, jobs: Job[]): Job | null {
  const candidates = jobs.filter(
    (j) => j.assigned_tech_id === techId && ACTIVE_STATUSES.includes(j.status),
  )
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]
  return [...candidates].sort((a, b) => {
    const dr = statusRank(b.status) - statusRank(a.status)
    if (dr !== 0) return dr
    return activityTimestamp(b) - activityTimestamp(a)
  })[0]
}

export function techPresence(techId: string, jobs: Job[]): { kind: TechPresenceKind; job: Job | null } {
  const job = pickActiveJobForTech(techId, jobs)
  if (!job) return { kind: 'idle', job: null }
  if (job.status === 'on_site') return { kind: 'on_site', job }
  if (job.status === 'en_route') return { kind: 'en_route', job }
  return { kind: 'dispatched', job }
}

export function computeJobStatusCounts(jobs: Job[]): Record<JobStatus, number> {
  const counts: Record<JobStatus, number> = {
    pending: 0,
    assigned: 0,
    en_route: 0,
    on_site: 0,
    complete: 0,
    cancelled: 0,
  }
  for (const j of jobs) {
    counts[j.status] += 1
  }
  return counts
}
