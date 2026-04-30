import { describe, expect, it } from 'vitest'
import type { Job } from '@/types/domain'
import {
  applyRealtimeJobsChange,
  computeTechJobsMetrics,
  filterJobsBySearch,
  filterJobsByTab,
  isSameLocalCalendarDay,
  jobFromRealtimeRow,
  mergeJobFromRealtime,
  sortJobsForDashboard,
} from './jobsDashboard'

const baseTime = '2026-04-22T15:00:00.000Z'

function makeJob(over: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    tenant_id: 'tenant-1',
    customer_name: 'John Doe',
    customer_phone: '+17035551234',
    address: '123 Main St, Woodbridge VA',
    lat: null,
    lng: null,
    vehicle_year: 2022,
    vehicle_make: 'Toyota',
    vehicle_model: 'Camry',
    service_type: 'tire_repair',
    service_variant: 'plug',
    vehicle_class: 'standard',
    location_type: 'suburban',
    status: 'assigned',
    assigned_tech_id: 'tech-1',
    price_cents: 15000,
    notes: null,
    source: 'manual',
    tracking_token: 'tok',
    tracking_expires_at: null,
    created_at: baseTime,
    assigned_at: baseTime,
    started_at: null,
    completed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    ...over,
  }
}

describe('filterJobsByTab', () => {
  const jobs = [
    makeJob({ id: '1', status: 'pending' }),
    makeJob({ id: '2', status: 'assigned' }),
    makeJob({ id: '3', status: 'en_route' }),
    makeJob({ id: '4', status: 'on_site' }),
    makeJob({ id: '5', status: 'complete' }),
    makeJob({ id: '6', status: 'cancelled' }),
  ]

  it('returns all jobs for all tab', () => {
    expect(filterJobsByTab(jobs, 'all')).toHaveLength(6)
  })

  it('filters pending', () => {
    expect(filterJobsByTab(jobs, 'pending').map((j) => j.id)).toEqual(['1'])
  })

  it('filters in progress', () => {
    expect(filterJobsByTab(jobs, 'in_progress').map((j) => j.id)).toEqual(['2', '3', '4'])
  })

  it('filters complete', () => {
    expect(filterJobsByTab(jobs, 'complete').map((j) => j.id)).toEqual(['5'])
  })
})

describe('filterJobsBySearch', () => {
  const jobs = [
    makeJob({ id: 'a', customer_name: 'Alice Smith', address: '1 Oak Rd' }),
    makeJob({ id: 'b', customer_name: 'Bob Jones', address: 'Woodbridge Center' }),
  ]

  it('returns all when query empty', () => {
    expect(filterJobsBySearch(jobs, '   ')).toEqual(jobs)
  })

  it('matches customer name case-insensitively', () => {
    expect(filterJobsBySearch(jobs, 'alice').map((j) => j.id)).toEqual(['a'])
  })

  it('matches address substring', () => {
    expect(filterJobsBySearch(jobs, 'woodbridge').map((j) => j.id)).toEqual(['b'])
  })
})

describe('computeTechJobsMetrics', () => {
  it('counts created today, pending, and completed today (local calendar)', () => {
    const ref = new Date(2030, 5, 10, 14, 0, 0)
    const sameDayMorning = new Date(2030, 5, 10, 8, 0, 0).toISOString()
    const priorDay = new Date(2030, 5, 9, 12, 0, 0).toISOString()
    const completedToday = new Date(2030, 5, 10, 11, 0, 0).toISOString()
    const jobs = [
      makeJob({
        id: 'c1',
        status: 'pending',
        created_at: sameDayMorning,
      }),
      makeJob({
        id: 'c2',
        status: 'complete',
        created_at: priorDay,
        completed_at: completedToday,
      }),
      makeJob({
        id: 'c3',
        status: 'assigned',
        created_at: priorDay,
      }),
    ]
    expect(computeTechJobsMetrics(jobs, ref)).toEqual({
      createdToday: 1,
      pending: 1,
      doneToday: 1,
    })
  })
})

describe('isSameLocalCalendarDay', () => {
  it('matches local calendar day', () => {
    const ref = new Date(2026, 3, 22, 18, 0, 0)
    const sameDayIso = new Date(2026, 3, 22, 2, 0, 0).toISOString()
    expect(isSameLocalCalendarDay(sameDayIso, ref)).toBe(true)
  })
})

describe('mergeJobFromRealtime', () => {
  it('updates an existing job by id', () => {
    const prev = [makeJob({ id: 'x', status: 'assigned' })]
    const next = mergeJobFromRealtime(prev, { id: 'x', status: 'en_route' })
    expect(next).toHaveLength(1)
    expect(next[0].status).toBe('en_route')
  })

  it('inserts a new job when id not present', () => {
    const prev = [makeJob({ id: 'old' })]
    const row = {
      id: 'new',
      tenant_id: 'tenant-1',
      customer_name: 'Jane',
      customer_phone: '+1',
      address: 'Addr',
      lat: null,
      lng: null,
      vehicle_year: null,
      vehicle_make: null,
      vehicle_model: null,
      service_type: 'jumpstart',
      service_variant: null,
      status: 'assigned',
      assigned_tech_id: 'tech-1',
      price_cents: null,
      notes: null,
      source: 'manual',
      tracking_token: 'abc',
      tracking_expires_at: null,
      created_at: baseTime,
      assigned_at: null,
      started_at: null,
      completed_at: null,
      cancelled_at: null,
      cancellation_reason: null,
    }
    const next = mergeJobFromRealtime(prev, row)
    expect(next.map((j) => j.id)).toContain('new')
    expect(next.find((j) => j.id === 'new')?.customer_name).toBe('Jane')
  })
})

describe('applyRealtimeJobsChange', () => {
  it('removes job when no longer assigned to this tech', () => {
    const prev = [makeJob({ id: 'x', assigned_tech_id: 'tech-1' })]
    const next = applyRealtimeJobsChange(prev, { id: 'x', assigned_tech_id: null }, 'tech-1')
    expect(next.find((j) => j.id === 'x')).toBeUndefined()
  })

  it('merges when still assigned to tech', () => {
    const prev = [makeJob({ id: 'x', status: 'assigned', assigned_tech_id: 'tech-1' })]
    const next = applyRealtimeJobsChange(prev, { id: 'x', assigned_tech_id: 'tech-1', status: 'en_route' }, 'tech-1')
    expect(next[0].status).toBe('en_route')
  })
})

describe('jobFromRealtimeRow', () => {
  it('returns null when required fields missing', () => {
    expect(jobFromRealtimeRow({ id: 'only-id' })).toBeNull()
  })
})

describe('sortJobsForDashboard', () => {
  it('sorts by created_at descending', () => {
    const a = makeJob({ id: 'a', created_at: '2026-04-20T00:00:00.000Z' })
    const b = makeJob({ id: 'b', created_at: '2026-04-22T00:00:00.000Z' })
    expect(sortJobsForDashboard([a, b]).map((j) => j.id)).toEqual(['b', 'a'])
  })
})
