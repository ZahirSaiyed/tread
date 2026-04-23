import { describe, it, expect } from 'vitest'
import {
  CreateJobSchema,
  PatchJobSchema,
  UpdateJobStatusSchema,
  AssignTechSchema,
  isValidTransition,
} from './job'

// ─── CreateJobSchema ────────────────────────────────────────────────────────

describe('CreateJobSchema', () => {
  const valid = {
    customer_name: 'Sarah Mitchell',
    customer_phone: '+17035550101',
    address: '4521 Dale Blvd, Dale City, VA 22193',
    service_type: 'mount_balance',
    service_variant: 'stock',
    source: 'manual',
  }

  it('accepts a minimal valid job', () => {
    expect(CreateJobSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects empty customer_name', () => {
    const r = CreateJobSchema.safeParse({ ...valid, customer_name: '' })
    expect(r.success).toBe(false)
  })

  it('rejects a non-E164 phone number', () => {
    const r = CreateJobSchema.safeParse({ ...valid, customer_phone: '703-555-0101' })
    expect(r.success).toBe(false)
  })

  it('rejects a UK phone in E164 format', () => {
    const r = CreateJobSchema.safeParse({ ...valid, customer_phone: '+447911123456' })
    expect(r.success).toBe(false)
  })

  it('accepts a valid US phone in E164 format', () => {
    const r = CreateJobSchema.safeParse({ ...valid, customer_phone: '+12025550199' })
    expect(r.success).toBe(true)
  })

  it('rejects an invalid service_type', () => {
    const r = CreateJobSchema.safeParse({ ...valid, service_type: 'flying_car' })
    expect(r.success).toBe(false)
  })

  it('defaults source to manual when omitted', () => {
    const { source, ...withoutSource } = valid
    void source
    const r = CreateJobSchema.safeParse(withoutSource)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.source).toBe('manual')
  })

  it('rejects a vehicle_year below 1980', () => {
    const r = CreateJobSchema.safeParse({ ...valid, vehicle_year: 1975 })
    expect(r.success).toBe(false)
  })

  it('accepts nullable optional fields', () => {
    const r = CreateJobSchema.safeParse({
      ...valid,
      lat: null,
      lng: null,
      vehicle_year: null,
      vehicle_make: null,
      assigned_tech_id: null,
    })
    expect(r.success).toBe(true)
  })
})

// ─── isValidTransition ──────────────────────────────────────────────────────

describe('isValidTransition', () => {
  it('allows pending → assigned', () => {
    expect(isValidTransition('pending', 'assigned')).toBe(true)
  })

  it('allows pending → cancelled', () => {
    expect(isValidTransition('pending', 'cancelled')).toBe(true)
  })

  it('allows assigned → en_route', () => {
    expect(isValidTransition('assigned', 'en_route')).toBe(true)
  })

  it('allows en_route → on_site', () => {
    expect(isValidTransition('en_route', 'on_site')).toBe(true)
  })

  it('allows on_site → complete', () => {
    expect(isValidTransition('on_site', 'complete')).toBe(true)
  })

  it('allows on_site → cancelled', () => {
    expect(isValidTransition('on_site', 'cancelled')).toBe(true)
  })

  it('rejects pending → complete (skips steps)', () => {
    expect(isValidTransition('pending', 'complete')).toBe(false)
  })

  it('rejects complete → anything (terminal state)', () => {
    expect(isValidTransition('complete', 'pending')).toBe(false)
    expect(isValidTransition('complete', 'cancelled')).toBe(false)
  })

  it('rejects cancelled → anything (terminal state)', () => {
    expect(isValidTransition('cancelled', 'pending')).toBe(false)
    expect(isValidTransition('cancelled', 'assigned')).toBe(false)
  })

  it('rejects backwards transition assigned → pending', () => {
    expect(isValidTransition('assigned', 'pending')).toBe(false)
  })
})

// ─── UpdateJobStatusSchema ──────────────────────────────────────────────────

describe('UpdateJobStatusSchema', () => {
  it('accepts a valid non-cancellation status', () => {
    const r = UpdateJobStatusSchema.safeParse({ status: 'en_route' })
    expect(r.success).toBe(true)
  })

  it('rejects cancelled without a reason', () => {
    const r = UpdateJobStatusSchema.safeParse({ status: 'cancelled' })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(r.error.errors[0]?.path).toContain('cancellation_reason')
    }
  })

  it('accepts cancelled with a reason', () => {
    const r = UpdateJobStatusSchema.safeParse({
      status: 'cancelled',
      cancellation_reason: 'Customer no longer needs service',
    })
    expect(r.success).toBe(true)
  })

  it('rejects an invalid status value', () => {
    const r = UpdateJobStatusSchema.safeParse({ status: 'driving' })
    expect(r.success).toBe(false)
  })
})

// ─── PatchJobSchema ───────────────────────────────────────────────────────────

describe('PatchJobSchema', () => {
  it('accepts a single-field patch', () => {
    const r = PatchJobSchema.safeParse({ customer_name: 'Updated' })
    expect(r.success).toBe(true)
  })

  it('rejects empty body', () => {
    const r = PatchJobSchema.safeParse({})
    expect(r.success).toBe(false)
  })

  it('rejects unknown keys (strict)', () => {
    const r = PatchJobSchema.safeParse({ customer_name: 'X', status: 'pending' })
    expect(r.success).toBe(false)
  })
})

// ─── AssignTechSchema ───────────────────────────────────────────────────────

describe('AssignTechSchema', () => {
  it('accepts a valid UUID', () => {
    const r = AssignTechSchema.safeParse({
      assigned_tech_id: 'a1b2c3d4-1234-1234-1234-a1b2c3d4e5f6',
    })
    expect(r.success).toBe(true)
  })

  it('rejects a non-UUID string', () => {
    const r = AssignTechSchema.safeParse({ assigned_tech_id: 'not-a-uuid' })
    expect(r.success).toBe(false)
  })

  it('rejects missing field', () => {
    const r = AssignTechSchema.safeParse({})
    expect(r.success).toBe(false)
  })
})
