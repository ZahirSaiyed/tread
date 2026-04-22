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
