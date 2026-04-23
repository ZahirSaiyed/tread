import type { Job, JobEvent, JobPhoto } from './domain'

// Standard API error response shape
export interface ApiError {
  error: string
  code?: string
}

// Standard paginated response
export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}

// GET /api/jobs/[id] — job with event history and photos
export interface JobDetail extends Job {
  events: JobEvent[]
  photos: JobPhoto[]
}
