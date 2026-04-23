import { describe, expect, it } from 'vitest'
import { parseListJobsQuery } from './jobsListQuery'

function params(obj: Record<string, string>) {
  return new URLSearchParams(obj)
}

describe('parseListJobsQuery', () => {
  it('parses defaults', () => {
    const r = parseListJobsQuery(params({}))
    expect(r.ok && r.data.page).toBe(1)
    expect(r.ok && r.data.pageSize).toBe(20)
  })

  it('parses status and service_type lists', () => {
    const r = parseListJobsQuery(
      params({ status: 'pending,assigned', service_type: 'tire_repair,jumpstart' }),
    )
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.status).toEqual(['pending', 'assigned'])
    expect(r.data.serviceTypes).toEqual(['tire_repair', 'jumpstart'])
  })

  it('expands calendar dates to UTC boundaries', () => {
    const r = parseListJobsQuery(params({ created_from: '2026-04-01', created_to: '2026-04-30' }))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.createdFromIso).toBe('2026-04-01T00:00:00.000Z')
    expect(r.data.createdToIso).toBe('2026-04-30T23:59:59.999Z')
  })

  it('rejects conflicting filters', () => {
    const r = parseListJobsQuery(
      params({
        unassigned_only: 'true',
        assigned_tech_id: '123e4567-e89b-12d3-a456-426614174000',
      }),
    )
    expect(r.ok).toBe(false)
  })
})
