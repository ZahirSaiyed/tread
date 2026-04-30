import { describe, expect, it } from 'vitest'
import type { Job } from '@/types/domain'
import {
  applyOperatorRealtimeJobsChange,
  computeJobStatusCounts,
  pickActiveJobForTech,
  sortUnassignedQueueOldestFirst,
  techPresence,
} from './operatorJobsBoard'

const baseTime = '2026-04-22T15:00:00.000Z'

function makeJob(over: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    tenant_id: 'tenant-1',
    customer_name: 'John Doe',
    customer_phone: '+17035551234',
    address: '123 Main St',
    lat: null,
    lng: null,
    vehicle_year: 2022,
    vehicle_make: 'Toyota',
    vehicle_model: 'Camry',
    service_type: 'tire_repair',
    service_variant: null,
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

describe('applyOperatorRealtimeJobsChange', () => {
  it('ignores rows for another tenant', () => {
    const prev = [makeJob({ id: 'a' })]
    const next = applyOperatorRealtimeJobsChange(
      prev,
      { id: 'a', tenant_id: 'other-tenant', status: 'en_route' },
      'tenant-1',
    )
    expect(next[0].status).toBe('assigned')
  })

  it('merges same-tenant updates', () => {
    const prev = [makeJob({ id: 'a', tenant_id: 'tenant-1' })]
    const next = applyOperatorRealtimeJobsChange(
      prev,
      { id: 'a', tenant_id: 'tenant-1', status: 'en_route' },
      'tenant-1',
    )
    expect(next[0].status).toBe('en_route')
  })
})

describe('sortUnassignedQueueOldestFirst', () => {
  it('orders pending unassigned by created_at ascending', () => {
    const jobs = [
      makeJob({ id: 'new', status: 'pending', assigned_tech_id: null, created_at: '2026-04-22T18:00:00.000Z' }),
      makeJob({ id: 'old', status: 'pending', assigned_tech_id: null, created_at: '2026-04-22T10:00:00.000Z' }),
      makeJob({ id: 'skip', status: 'assigned', assigned_tech_id: 'tech-1', created_at: '2026-04-22T08:00:00.000Z' }),
    ]
    expect(sortUnassignedQueueOldestFirst(jobs).map((j) => j.id)).toEqual(['old', 'new'])
  })
})

describe('pickActiveJobForTech', () => {
  it('returns null when no active job', () => {
    expect(pickActiveJobForTech('tech-1', [makeJob({ assigned_tech_id: null, status: 'pending' })])).toBeNull()
  })

  it('prefers on_site over en_route', () => {
    const jobs = [
      makeJob({
        id: 'route',
        status: 'en_route',
        assigned_tech_id: 'tech-1',
        started_at: '2026-04-22T16:00:00.000Z',
      }),
      makeJob({
        id: 'site',
        status: 'on_site',
        assigned_tech_id: 'tech-1',
        started_at: '2026-04-22T15:00:00.000Z',
      }),
    ]
    expect(pickActiveJobForTech('tech-1', jobs)?.id).toBe('site')
  })
})

describe('techPresence', () => {
  it('idle when no active job', () => {
    expect(techPresence('tech-1', []).kind).toBe('idle')
  })

  it('dispatched for assigned', () => {
    const p = techPresence('tech-1', [makeJob({ status: 'assigned', assigned_tech_id: 'tech-1' })])
    expect(p.kind).toBe('dispatched')
    expect(p.job?.status).toBe('assigned')
  })
})

describe('computeJobStatusCounts', () => {
  it('counts by status', () => {
    const jobs = [
      makeJob({ id: '1', status: 'pending' }),
      makeJob({ id: '2', status: 'pending' }),
      makeJob({ id: '3', status: 'complete' }),
    ]
    expect(computeJobStatusCounts(jobs)).toMatchObject({ pending: 2, complete: 1 })
  })
})
