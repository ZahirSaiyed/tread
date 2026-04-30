'use client'

import { useState, useRef } from 'react'
import type { PricingRule } from '@/types/domain'
import { VEHICLE_CLASS_LABELS, LOCATION_TYPE_LABELS } from '@/types/enums'
import { formatCents } from '@/lib/pricing/quote'
import { updatePricingRule } from './actions'

interface Props {
  rule: PricingRule
}

export function PricingRuleRow({ rule }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

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

  const cellClass = 'text-sm py-3 px-4'
  const inputClass =
    'w-full bg-[#2C2C2E] text-white rounded-lg px-2 py-1.5 text-sm border border-[#48484A] focus:border-[#F5A623] focus:outline-none'

  if (!editing) {
    return (
      <div
        className={`grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_48px] gap-0 border-b border-[#2C2C2E] last:border-0 hover:bg-[#2C2C2E] transition-colors ${rule.is_active ? '' : 'opacity-40'}`}
      >
        <span className={`${cellClass} text-[#8E8E93]`}>
          {VEHICLE_CLASS_LABELS[rule.vehicle_class].split(' ')[0]}
        </span>
        <span className={`${cellClass} text-[#8E8E93]`}>
          {LOCATION_TYPE_LABELS[rule.location_type]}
        </span>
        <span className={`${cellClass} text-white font-mono`}>
          {formatCents(rule.base_price_cents)}
        </span>
        <span className={`${cellClass} text-white font-mono`}>
          {formatCents(rule.mobile_fee_cents)}
        </span>
        <span className={`${cellClass} text-[#8E8E93] font-mono`}>
          {rule.disposal_fee_cents > 0 ? formatCents(rule.disposal_fee_cents) : '—'}
        </span>
        <span className={`${cellClass} text-[#8E8E93] font-mono`}>
          {(rule.tax_rate * 100).toFixed(1)}%
        </span>
        <div className={`${cellClass} flex items-center justify-center`}>
          <button
            onClick={() => setEditing(true)}
            className="text-[#F5A623] text-xs hover:underline"
            aria-label="Edit pricing rule"
          >
            Edit
          </button>
        </div>
      </div>
    )
  }

  return (
    <form
      ref={formRef}
      action={handleSave}
      className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_48px] gap-0 border-b border-[#2C2C2E] last:border-0 bg-[#2C2C2E] px-4 py-2 items-center"
    >
      <input type="hidden" name="id" value={rule.id} />
      <input type="hidden" name="service_type" value={rule.service_type} />
      <input type="hidden" name="vehicle_class" value={rule.vehicle_class} />
      <input type="hidden" name="location_type" value={rule.location_type} />
      <input type="hidden" name="is_active" value={String(rule.is_active)} />

      <span className="text-[#8E8E93] text-sm pr-2">
        {VEHICLE_CLASS_LABELS[rule.vehicle_class].split(' ')[0]}
      </span>
      <span className="text-[#8E8E93] text-sm pr-2">
        {LOCATION_TYPE_LABELS[rule.location_type]}
      </span>

      <div className="pr-2">
        <CentsInput name="base_price_cents" defaultCents={rule.base_price_cents} />
      </div>
      <div className="pr-2">
        <CentsInput name="mobile_fee_cents" defaultCents={rule.mobile_fee_cents} />
      </div>
      <div className="pr-2">
        <CentsInput name="disposal_fee_cents" defaultCents={rule.disposal_fee_cents} />
      </div>
      <div className="pr-2">
        <input
          name="tax_rate"
          type="text"
          inputMode="decimal"
          defaultValue={rule.tax_rate}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1">
        <button
          type="submit"
          disabled={saving}
          className="text-[#34C759] text-xs hover:underline disabled:opacity-50"
        >
          {saving ? '…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError(null) }}
          className="text-[#8E8E93] text-xs hover:underline"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="col-span-7 text-[#FF3B30] text-xs px-4 pb-2">{error}</p>
      )}
    </form>
  )
}

// Displays a dollar value but stores/submits as cents
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
        className="w-full bg-[#1C1C1E] text-white rounded-lg pl-5 pr-2 py-1.5 text-sm border border-[#48484A] focus:border-[#F5A623] focus:outline-none"
      />
      <input type="hidden" name={name} value={centValue} />
    </div>
  )
}
