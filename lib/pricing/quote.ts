import type { PricingRule } from '@/types/domain'
import type { ServiceType } from '@/types/enums'
import { SERVICE_TYPE_LABELS } from '@/types/enums'

// Wheel lock removal is a conditional line item not stored in pricing_rules.
// Industry standard rate for mobile service.
export const WHEEL_LOCK_FEE_CENTS = 2500 // $25 per wheel lock

export interface QuoteLineItem {
  label: string
  amount_cents: number
}

export interface QuoteResult {
  line_items: QuoteLineItem[]
  subtotal_cents: number  // before tax
  tax_cents: number
  total_cents: number
  rule_id: string
}

export interface QuoteParams {
  rule: PricingRule
  // For per-unit services (mount & balance: number of tires, TPMS: number of sensors).
  // Fixed-rate services (jumpstart, rotation) always use quantity=1.
  quantity?: number
  wheel_lock_count?: number
}

export function calculateQuote(params: QuoteParams): QuoteResult {
  const { rule, quantity = 1, wheel_lock_count = 0 } = params

  if (quantity < 1) throw new Error('quantity must be ≥ 1')
  if (wheel_lock_count < 0) throw new Error('wheel_lock_count must be ≥ 0')

  const serviceLabel = SERVICE_TYPE_LABELS[rule.service_type as ServiceType] ?? rule.service_type

  const items: QuoteLineItem[] = []

  // 1. Base service (quantity-aware)
  const baseTotal = rule.base_price_cents * quantity
  items.push({
    label: quantity > 1 ? `${serviceLabel} ×${quantity}` : serviceLabel,
    amount_cents: baseTotal,
  })

  // 2. Mobile dispatch fee (flat per job)
  if (rule.mobile_fee_cents > 0) {
    items.push({ label: 'Mobile dispatch fee', amount_cents: rule.mobile_fee_cents })
  }

  // 3. Disposal fee (per unit)
  if (rule.disposal_fee_cents > 0) {
    const disposalTotal = rule.disposal_fee_cents * quantity
    items.push({
      label: quantity > 1 ? `Disposal fee ×${quantity}` : 'Disposal fee',
      amount_cents: disposalTotal,
    })
  }

  // 4. Wheel lock removal (conditional)
  if (wheel_lock_count > 0) {
    items.push({
      label: `Wheel lock removal ×${wheel_lock_count}`,
      amount_cents: WHEEL_LOCK_FEE_CENTS * wheel_lock_count,
    })
  }

  // 5. Tax — applied to everything above, rounded to nearest cent
  const subtotal = items.reduce((sum, item) => sum + item.amount_cents, 0)
  const taxCents = Math.round(subtotal * rule.tax_rate)
  items.push({
    label: `Tax (${(rule.tax_rate * 100).toFixed(1)}%)`,
    amount_cents: taxCents,
  })

  return {
    line_items: items,
    subtotal_cents: subtotal,
    tax_cents: taxCents,
    total_cents: subtotal + taxCents,
    rule_id: rule.id,
  }
}

// Formats a cent amount as a USD string: 13250 → "$132.50"
export function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}
