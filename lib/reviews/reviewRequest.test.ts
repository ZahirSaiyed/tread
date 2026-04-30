import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { composeReviewSms, sendReviewRequest } from './reviewRequest'
import type { Job } from '@/types/domain'

// ─── composeReviewSms (pure function — no mocks needed) ───────────────────────

describe('composeReviewSms', () => {
  const base = {
    customerName: 'John Smith',
    techName: 'Marcus Johnson',
    serviceType: 'tire_repair',
    trackingUrl: 'https://trs.app/api/r/abc-123',
  }

  it('uses the customer first name only', () => {
    const msg = composeReviewSms(base)
    expect(msg).toContain('Hi John!')
    expect(msg).not.toContain('Smith')
  })

  it('includes the tech first name when available', () => {
    const msg = composeReviewSms(base)
    expect(msg).toContain('Marcus')
    expect(msg).not.toContain('Johnson')
  })

  it('gracefully handles missing tech name', () => {
    const msg = composeReviewSms({ ...base, techName: null })
    expect(msg).toContain('Hi John!')
    expect(msg).not.toContain('null')
    expect(msg).not.toContain('undefined')
  })

  it('gracefully handles missing tech name (undefined)', () => {
    const msg = composeReviewSms({ ...base, techName: undefined })
    expect(msg).not.toContain('undefined')
    expect(msg).toContain('Tire Repair')
  })

  it('uses the human-readable service label', () => {
    const msg = composeReviewSms(base)
    expect(msg).toContain('Tire Repair')
    expect(msg).not.toContain('tire_repair')
  })

  it('falls back to raw service type for unknown services', () => {
    const msg = composeReviewSms({ ...base, serviceType: 'custom_job' })
    expect(msg).toContain('custom_job')
  })

  it('includes the tracking URL', () => {
    const msg = composeReviewSms(base)
    expect(msg).toContain('https://trs.app/api/r/abc-123')
  })

  it('uses "there" when customer name is empty', () => {
    const msg = composeReviewSms({ ...base, customerName: '' })
    expect(msg).toContain('Hi there!')
  })

  it('stays under 320 characters (≤ 2 SMS segments)', () => {
    const msg = composeReviewSms(base)
    expect(msg.length).toBeLessThanOrEqual(320)
  })

  it('handles single-word customer names', () => {
    const msg = composeReviewSms({ ...base, customerName: 'Cher' })
    expect(msg).toContain('Hi Cher!')
  })
})

// ─── sendReviewRequest (integration logic — mocked Supabase) ──────────────────

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockSingle = vi.fn()
const mockMaybeSingle = vi.fn()

// Build a chainable Supabase mock
function makeSupabaseMock() {
  return {
    from: vi.fn().mockReturnValue({
      select: mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
          single: mockSingle,
        }),
      }),
      insert: mockInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }),
      update: mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  }
}

const baseJob: Job = {
  id: 'job-uuid-1',
  tenant_id: 'tenant-uuid-1',
  customer_name: 'John Smith',
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
  status: 'complete',
  assigned_tech_id: 'tech-uuid-1',
  price_cents: 15000,
  notes: null,
  source: 'manual',
  tracking_token: 'tok123',
  tracking_expires_at: null,
  created_at: '2026-04-30T15:00:00Z',
  assigned_at: '2026-04-30T15:05:00Z',
  started_at: null,
  completed_at: '2026-04-30T16:00:00Z',
  cancelled_at: null,
  cancellation_reason: null,
  assigned_tech: {
    id: 'tech-uuid-1',
    tenant_id: 'tenant-uuid-1',
    role: 'tech',
    name: 'Marcus Johnson',
    phone: '+17035559999',
    email: null,
    avatar_url: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
}

const baseOptions = {
  job: baseJob,
  tenantTwilioNumber: '+15713303045',
  googleReviewUrl: 'https://g.page/r/trs-review',
  appUrl: 'https://trs.app',
}

describe('sendReviewRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips entirely when googleReviewUrl is null', async () => {
    const supabase = makeSupabaseMock() as unknown as Parameters<typeof sendReviewRequest>[0]['supabase']
    await sendReviewRequest({ supabase, ...baseOptions, googleReviewUrl: null })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('skips when a review_request already exists for the job', async () => {
    const supabase = makeSupabaseMock() as unknown as Parameters<typeof sendReviewRequest>[0]['supabase']
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'existing-rr' }, error: null })

    await sendReviewRequest({ supabase, ...baseOptions })

    // from() called once (dedup check), but insert never called
    expect((supabase.from as Mock).mock.calls.length).toBe(1)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('creates a review_request record on happy path', async () => {
    const supabase = makeSupabaseMock() as unknown as Parameters<typeof sendReviewRequest>[0]['supabase']
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockSingle.mockResolvedValueOnce({ data: { id: 'new-rr-uuid' }, error: null })

    // No Twilio configured — SMS skipped but record should be created
    await sendReviewRequest({
      supabase,
      ...baseOptions,
      tenantTwilioNumber: null,
    })

    expect(mockInsert).toHaveBeenCalledOnce()
    const insertPayload = mockInsert.mock.calls[0][0]
    expect(insertPayload).toMatchObject({
      tenant_id: baseJob.tenant_id,
      job_id: baseJob.id,
      customer_phone: baseJob.customer_phone,
      review_url: baseOptions.googleReviewUrl,
    })
  })

  it('does not throw if insert fails', async () => {
    const supabase = makeSupabaseMock() as unknown as Parameters<typeof sendReviewRequest>[0]['supabase']
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'DB error' } })

    await expect(
      sendReviewRequest({ supabase, ...baseOptions })
    ).resolves.toBeUndefined()
  })

  it('does not throw if Twilio send fails', async () => {
    vi.mock('@/lib/twilio/client', () => ({
      getTwilioClient: () => ({
        messages: {
          create: vi.fn().mockRejectedValue(new Error('Twilio error')),
        },
      }),
    }))

    const supabase = makeSupabaseMock() as unknown as Parameters<typeof sendReviewRequest>[0]['supabase']
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockSingle.mockResolvedValueOnce({ data: { id: 'new-rr-uuid' }, error: null })

    await expect(
      sendReviewRequest({ supabase, ...baseOptions })
    ).resolves.toBeUndefined()
  })
})
