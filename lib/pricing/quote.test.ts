import { describe, it, expect } from 'vitest'
import { calculateQuote, WHEEL_LOCK_FEE_CENTS, formatCents } from './quote'
import type { PricingRule } from '@/types/domain'

// ─── Helpers ────────────────────────────────────────────────────────────────

function rule(overrides: Partial<PricingRule> = {}): PricingRule {
  return {
    id: 'rule-test-id',
    tenant_id: 'tenant-test-id',
    service_type: 'tire_repair',
    vehicle_class: 'standard',
    location_type: 'suburban',
    base_price_cents: 2500,
    mobile_fee_cents: 10000,
    disposal_fee_cents: 0,
    tax_rate: 0.06,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── Flat Repair — Standard, Suburban ───────────────────────────────────────

describe('tire_repair / standard / suburban', () => {
  const r = rule()

  it('produces the correct subtotal', () => {
    const q = calculateQuote({ rule: r })
    // base $25 + mobile $100 = $125
    expect(q.subtotal_cents).toBe(12500)
  })

  it('computes Virginia 6% tax correctly', () => {
    const q = calculateQuote({ rule: r })
    // 12500 × 0.06 = 750
    expect(q.tax_cents).toBe(750)
  })

  it('totals to $132.50', () => {
    const q = calculateQuote({ rule: r })
    expect(q.total_cents).toBe(13250)
  })

  it('returns 3 line items (base, mobile, tax)', () => {
    const q = calculateQuote({ rule: r })
    expect(q.line_items).toHaveLength(3)
  })

  it('labels the base line item with the service name', () => {
    const q = calculateQuote({ rule: r })
    expect(q.line_items[0]?.label).toBe('Tire Repair')
  })
})

// ─── Tire Repair — Truck, Highway ───────────────────────────────────────────

describe('tire_repair / truck / highway', () => {
  const r = rule({ vehicle_class: 'truck', location_type: 'highway', base_price_cents: 3500, mobile_fee_cents: 17500 })

  it('applies the highway mobile fee', () => {
    const q = calculateQuote({ rule: r })
    const mobileLine = q.line_items.find(l => l.label === 'Mobile dispatch fee')
    expect(mobileLine?.amount_cents).toBe(17500)
  })

  it('totals to $222.60', () => {
    const q = calculateQuote({ rule: r })
    // base $35 + mobile $175 = $210, tax $12.60 → $222.60
    expect(q.total_cents).toBe(22260)
  })

  it('highway total is higher than suburban equivalent', () => {
    const suburban = calculateQuote({ rule: rule({ vehicle_class: 'truck', base_price_cents: 3500, mobile_fee_cents: 10000 }) })
    const highway = calculateQuote({ rule: r })
    expect(highway.total_cents).toBeGreaterThan(suburban.total_cents)
  })
})

// ─── Mount & Balance — Standard, Suburban, 4 tires ─────────────────────────

describe('mount_balance / standard / suburban / qty=4', () => {
  const r = rule({
    service_type: 'mount_balance',
    base_price_cents: 3500,
    mobile_fee_cents: 10000,
    disposal_fee_cents: 500,
  })

  it('multiplies base and disposal by quantity', () => {
    const q = calculateQuote({ rule: r, quantity: 4 })
    const baseLine = q.line_items[0]
    const disposalLine = q.line_items.find(l => l.label.startsWith('Disposal'))
    expect(baseLine?.amount_cents).toBe(14000)   // 4 × $35
    expect(disposalLine?.amount_cents).toBe(2000)  // 4 × $5
  })

  it('does NOT multiply mobile fee by quantity', () => {
    const q = calculateQuote({ rule: r, quantity: 4 })
    const mobileLine = q.line_items.find(l => l.label === 'Mobile dispatch fee')
    expect(mobileLine?.amount_cents).toBe(10000)  // flat, not ×4
  })

  it('totals to $275.60', () => {
    const q = calculateQuote({ rule: r, quantity: 4 })
    // base 14000 + mobile 10000 + disposal 2000 = 26000, tax 1560 → 27560
    expect(q.total_cents).toBe(27560)
  })

  it('labels the base line item with quantity', () => {
    const q = calculateQuote({ rule: r, quantity: 4 })
    expect(q.line_items[0]?.label).toBe('Mount & Balance ×4')
  })
})

// ─── Mount & Balance — SUV, Highway, 4 tires ────────────────────────────────

describe('mount_balance / suv / highway / qty=4', () => {
  const r = rule({
    service_type: 'mount_balance',
    vehicle_class: 'suv',
    location_type: 'highway',
    base_price_cents: 4200,
    mobile_fee_cents: 17500,
    disposal_fee_cents: 500,
  })

  it('totals to $384.78', () => {
    const q = calculateQuote({ rule: r, quantity: 4 })
    // base 4×4200=16800 + mobile 17500 + disposal 4×500=2000 = 36300, tax 2178 → 38478
    expect(q.total_cents).toBe(38478)
  })
})

// ─── Wheel Lock — conditional inclusion ─────────────────────────────────────

describe('wheel lock removal', () => {
  const r = rule({ service_type: 'mount_balance', base_price_cents: 3500, mobile_fee_cents: 10000 })

  it('is NOT included when wheel_lock_count is 0', () => {
    const q = calculateQuote({ rule: r, quantity: 1, wheel_lock_count: 0 })
    const wl = q.line_items.find(l => l.label.startsWith('Wheel lock'))
    expect(wl).toBeUndefined()
  })

  it('is included when wheel_lock_count is 1', () => {
    const q = calculateQuote({ rule: r, quantity: 1, wheel_lock_count: 1 })
    const wl = q.line_items.find(l => l.label.startsWith('Wheel lock'))
    expect(wl).toBeDefined()
    expect(wl?.amount_cents).toBe(WHEEL_LOCK_FEE_CENTS)
  })

  it('scales with wheel_lock_count', () => {
    const q = calculateQuote({ rule: r, quantity: 4, wheel_lock_count: 4 })
    const wl = q.line_items.find(l => l.label.startsWith('Wheel lock'))
    expect(wl?.amount_cents).toBe(WHEEL_LOCK_FEE_CENTS * 4)
  })

  it('adds wheel lock fee to the tax base', () => {
    const withLock = calculateQuote({ rule: r, wheel_lock_count: 1 })
    const without = calculateQuote({ rule: r, wheel_lock_count: 0 })
    // Wheel lock adds $25 to subtotal → extra tax of Math.round(2500 × 0.06) = 150 cents
    expect(withLock.tax_cents - without.tax_cents).toBe(150)
  })
})

// ─── Tax Calculation ─────────────────────────────────────────────────────────

describe('tax calculation', () => {
  it('rounds to the nearest cent (no fractional cents)', () => {
    // subtotal = 10001 cents, tax = Math.round(10001 × 0.06) = Math.round(600.06) = 600
    const r = rule({ base_price_cents: 1, mobile_fee_cents: 10000, tax_rate: 0.06 })
    const q = calculateQuote({ rule: r })
    expect(Number.isInteger(q.tax_cents)).toBe(true)
  })

  it('uses rule tax_rate (not hardcoded)', () => {
    const r7 = rule({ tax_rate: 0.07 })
    const r6 = rule({ tax_rate: 0.06 })
    const q7 = calculateQuote({ rule: r7 })
    const q6 = calculateQuote({ rule: r6 })
    expect(q7.tax_cents).toBeGreaterThan(q6.tax_cents)
  })

  it('0% tax rate produces zero tax', () => {
    const r = rule({ tax_rate: 0 })
    const q = calculateQuote({ rule: r })
    expect(q.tax_cents).toBe(0)
    expect(q.total_cents).toBe(q.subtotal_cents)
  })

  it('total = subtotal + tax_cents (never rounds the total)', () => {
    const r = rule({ base_price_cents: 3333, mobile_fee_cents: 7777 })
    const q = calculateQuote({ rule: r })
    expect(q.total_cents).toBe(q.subtotal_cents + q.tax_cents)
  })
})

// ─── Jumpstart ───────────────────────────────────────────────────────────────

describe('jumpstart / standard / suburban', () => {
  const r = rule({ service_type: 'jumpstart', base_price_cents: 7500, mobile_fee_cents: 10000 })

  it('totals to $185.50', () => {
    const q = calculateQuote({ rule: r })
    // base $75 + mobile $100 = $175, tax $10.50 → $185.50
    expect(q.total_cents).toBe(18550)
  })
})

// ─── Tony's Last 10 Jobs (regression scenarios) ──────────────────────────────

describe("Tony's last 10 jobs — all match within $5 of expected", () => {
  const FIVE_DOLLARS = 500 // cents

  const cases: Array<{
    description: string
    rule: PricingRule
    quantity?: number
    wheel_lock_count?: number
    expected_total_cents: number
  }> = [
    {
      description: 'Sarah Mitchell — flat repair, Camry, suburban',
      rule: rule({ service_type: 'tire_repair', base_price_cents: 2500, mobile_fee_cents: 10000 }),
      expected_total_cents: 13250, // $132.50
    },
    {
      description: 'James Okafor — M&B ×4, F-150 (truck), suburban',
      rule: rule({ service_type: 'mount_balance', vehicle_class: 'truck', base_price_cents: 5000, mobile_fee_cents: 10000, disposal_fee_cents: 500 }),
      quantity: 4,
      expected_total_cents: 33920, // $339.20
    },
    {
      description: 'Linda Pham — jumpstart, CR-V (suv), suburban',
      rule: rule({ service_type: 'jumpstart', vehicle_class: 'suv', base_price_cents: 7500, mobile_fee_cents: 10000 }),
      expected_total_cents: 18550, // $185.50
    },
    {
      description: 'Derek Washington — M&B ×4, Silverado (truck), suburban',
      rule: rule({ service_type: 'mount_balance', vehicle_class: 'truck', base_price_cents: 5000, mobile_fee_cents: 10000, disposal_fee_cents: 500 }),
      quantity: 4,
      expected_total_cents: 33920, // $339.20
    },
    {
      description: 'Carlos Rivera — M&B ×2, Civic (standard), suburban',
      rule: rule({ service_type: 'mount_balance', base_price_cents: 3500, mobile_fee_cents: 10000, disposal_fee_cents: 500 }),
      quantity: 2,
      expected_total_cents: 19080, // $190.80 — base 7000 + mobile 10000 + disposal 1000 = 18000, tax 1080
    },
    {
      description: 'Patricia Kim — spare installation, RAV4 (suv), suburban',
      rule: rule({ service_type: 'spare_installation', vehicle_class: 'suv', base_price_cents: 5000, mobile_fee_cents: 10000 }),
      expected_total_cents: 15900, // $159.00
    },
    {
      description: 'David Chen — tire rotation, CX-5 (suv), suburban',
      rule: rule({ service_type: 'tire_rotation', vehicle_class: 'suv', base_price_cents: 6000, mobile_fee_cents: 10000 }),
      expected_total_cents: 16960, // $169.60
    },
    {
      description: 'Michael Thompson — flat repair, F-150 (truck), I-95 highway',
      rule: rule({ service_type: 'tire_repair', vehicle_class: 'truck', location_type: 'highway', base_price_cents: 3500, mobile_fee_cents: 17500 }),
      expected_total_cents: 22260, // $222.60
    },
    {
      description: 'Jennifer Davis — TPMS ×2, Accord (standard), suburban',
      rule: rule({ service_type: 'tpms_service', base_price_cents: 3500, mobile_fee_cents: 10000 }),
      quantity: 2,
      expected_total_cents: 18020, // $180.20 — base 7000 + mobile 10000 = 17000, tax 1020
    },
    {
      description: 'Marcus Johnson — M&B ×4, BMW 3 Series (specialty), suburban, 1 wheel lock',
      rule: rule({ service_type: 'mount_balance', vehicle_class: 'specialty', base_price_cents: 6500, mobile_fee_cents: 10000, disposal_fee_cents: 500 }),
      quantity: 4,
      wheel_lock_count: 1,
      expected_total_cents: 34980,
      // base 4×6500=26000 + mobile 10000 + disposal 4×500=2000 + wheel_lock 2500 = 40500, tax Math.round(40500×0.06)=2430 → 42930
      // Wait, let me recalculate: 26000+10000+2000+2500=40500, tax=2430 → total=42930
      // Expected: $429.30 but I said 34980 above. Let me fix.
    },
  ]

  // Fix the last case expected value
  cases[9]!.expected_total_cents = 42930 // $429.30

  cases.forEach(({ description, rule: r, quantity, wheel_lock_count, expected_total_cents }) => {
    it(description, () => {
      const q = calculateQuote({ rule: r, quantity, wheel_lock_count })
      const delta = Math.abs(q.total_cents - expected_total_cents)
      expect(delta).toBeLessThanOrEqual(FIVE_DOLLARS)
    })
  })
})

// ─── Guard rails ─────────────────────────────────────────────────────────────

describe('invalid inputs', () => {
  it('throws on quantity < 1', () => {
    expect(() => calculateQuote({ rule: rule(), quantity: 0 })).toThrow()
  })

  it('throws on negative wheel_lock_count', () => {
    expect(() => calculateQuote({ rule: rule(), wheel_lock_count: -1 })).toThrow()
  })
})

// ─── formatCents ─────────────────────────────────────────────────────────────

describe('formatCents', () => {
  it('formats 13250 as $132.50', () => {
    expect(formatCents(13250)).toBe('$132.50')
  })

  it('formats 0 as $0.00', () => {
    expect(formatCents(0)).toBe('$0.00')
  })

  it('formats 100 as $1.00', () => {
    expect(formatCents(100)).toBe('$1.00')
  })
})
