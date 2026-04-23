import type { JobStatus } from '@/types/enums'
import { isValidTransition } from '@/lib/validators/job'

export interface NextStatusAction {
  target: JobStatus
  label: string
}

const DEFAULT_FORWARD: Partial<Record<JobStatus, NextStatusAction>> = {
  pending: { target: 'assigned', label: 'Accept job' },
  assigned: { target: 'en_route', label: 'Accept & roll' },
  en_route: { target: 'on_site', label: 'On site' },
  on_site: { target: 'complete', label: 'Complete' },
}

/**
 * Single primary CTA: next forward status in the dispatch flow, only if allowed.
 */
export function getNextStatusAction(current: JobStatus): NextStatusAction | null {
  const candidate = DEFAULT_FORWARD[current]
  if (!candidate) return null
  if (!isValidTransition(current, candidate.target)) return null
  return candidate
}
