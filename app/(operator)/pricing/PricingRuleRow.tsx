'use client'

import { useState } from 'react'
import type { PricingRule } from '@/types/domain'
import { VEHICLE_CLASS_LABELS, LOCATION_TYPE_LABELS } from '@/types/enums'
import { formatCents } from '@/lib/pricing/quote'
import { updatePricingRule } from './actions'

interface Props {
  rule: PricingRule
}

const inputClass =
  'w-full bg-trs-charcoal text-white rounded-lg px-2 py-1.5 text-sm border border-trs-slate focus:border-trs-gold focus:outline-none focus-visible:ring-1 focus-visible:ring-trs-gold/50'

export function PricingRuleRow({ rule }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(formData: FormData) {
    setSaving(true)
    setError(null)
    try {
      await updatePricingRule(formData)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const vehicleLabel = VEHICLE_CLASS_LABELS[rule.vehicle_class].split(' (')[0]
  const locationLabel = LOCATION_TYPE_LABELS[rule.location_type]

  if (!editing) {
    return (
      <div className={rule.is_active ? '' : 'opacity-40'}>
        {/* ── Mobile card (hidden on sm+) ── */}
        <div className="sm:hidden border-b border-[#2C2C2E] last:border-0 px-4 py-3 hover:bg-[#2C2C2E] transition-colors">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-white">{vehicleLabel}</p>
              <p className="text-xs text-[#8E8E93] mt-0.5">{locationLabel}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="text-trs-gold text-xs hover:underline shrink-0 min-h-touch min-w-touch flex items-center justify-end"
              aria-label="Edit pricing rule"
            >
              Edit
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#8E8E93]">Base</span>
              <span className="font-mono text-white">{formatCents(rule.base_price_cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8E8E93]">Mobile fee</span>
              <span className="font-mono text-white">{formatCents(rule.mobile_fee_cents)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8E8E93]">Disposal</span>
              <span className="font-mono text-[#8E8E93]">
                {rule.disposal_fee_cents > 0 ? formatCents(rule.disposal_fee_cents) : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8E8E93]">Tax</span>
              <span className="font-mono text-[#8E8E93]">{(rule.tax_rate * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* ── Desktop table row (hidden below sm) ── */}
        <div className="hidden sm:grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_48px] gap-0 border-b border-[#2C2C2E] last:border-0 hover:bg-[#2C2C2E] transition-colors">
          <span className="py-3 px-4 text-sm text-[#8E8E93]">{vehicleLabel}</span>
          <span className="py-3 px-4 text-sm text-[#8E8E93]">{locationLabel}</span>
          <span className="py-3 px-4 text-sm font-mono text-white">{formatCents(rule.base_price_cents)}</span>
          <span className="py-3 px-4 text-sm font-mono text-white">{formatCents(rule.mobile_fee_cents)}</span>
          <span className="py-3 px-4 text-sm font-mono text-[#8E8E93]">
            {rule.disposal_fee_cents > 0 ? formatCents(rule.disposal_fee_cents) : '—'}
          </span>
          <span className="py-3 px-4 text-sm font-mono text-[#8E8E93]">{(rule.tax_rate * 100).toFixed(1)}%</span>
          <div className="py-3 px-4 flex items-center justify-center">
            <button
              onClick={() => setEditing(true)}
              className="text-trs-gold text-xs hover:underline"
              aria-label="Edit pricing rule"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Edit mode — shared for both breakpoints
  return (
    <form
      action={handleSave}
      className="border-b border-[#2C2C2E] last:border-0 bg-trs-charcoal px-4 py-3 space-y-3"
    >
      <input type="hidden" name="id" value={rule.id} />
      <input type="hidden" name="service_type" value={rule.service_type} />
      <input type="hidden" name="vehicle_class" value={rule.vehicle_class} />
      <input type="hidden" name="location_type" value={rule.location_type} />
      <input type="hidden" name="is_active" value={String(rule.is_active)} />

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">{vehicleLabel}</p>
          <p className="text-xs text-[#8E8E93]">{locationLabel}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-trs-gold px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-50"
          >
            {saving ? '…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setError(null) }}
            className="rounded-lg border border-trs-slate px-3 py-1.5 text-xs text-[#8E8E93] hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#8E8E93] mb-1">Base (per unit)</label>
          <CentsInput name="base_price_cents" defaultCents={rule.base_price_cents} />
        </div>
        <div>
          <label className="block text-xs text-[#8E8E93] mb-1">Mobile fee</label>
          <CentsInput name="mobile_fee_cents" defaultCents={rule.mobile_fee_cents} />
        </div>
        <div>
          <label className="block text-xs text-[#8E8E93] mb-1">Disposal fee</label>
          <CentsInput name="disposal_fee_cents" defaultCents={rule.disposal_fee_cents} />
        </div>
        <div>
          <label className="block text-xs text-[#8E8E93] mb-1">Tax rate (e.g. 0.06)</label>
          <input
            name="tax_rate"
            type="text"
            inputMode="decimal"
            defaultValue={rule.tax_rate}
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-status-urgent text-xs">{error}</p>}
    </form>
  )
}

function CentsInput({ name, defaultCents }: { name: string; defaultCents: number }) {
  const [dollars, setDollars] = useState((defaultCents / 100).toFixed(2))
  const centValue = Math.round(parseFloat(dollars || '0') * 100)

  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#8E8E93] text-sm">$</span>
      <input
        type="text"
        inputMode="decimal"
        value={dollars}
        onChange={(e) => setDollars(e.target.value)}
        className="w-full bg-[#1C1C1E] text-white rounded-lg pl-5 pr-2 py-1.5 text-sm border border-trs-slate focus:border-trs-gold focus:outline-none"
      />
      <input type="hidden" name={name} value={centValue} />
    </div>
  )
}
