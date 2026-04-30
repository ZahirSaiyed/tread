'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/types/domain'
import { SERVICE_TYPE_LABELS, VEHICLE_CLASS_LABELS, LOCATION_TYPE_LABELS } from '@/types/enums'

type TechOpt = { id: string; name: string }

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS) as (keyof typeof SERVICE_TYPE_LABELS)[]
const VEHICLE_CLASSES = Object.entries(VEHICLE_CLASS_LABELS) as [keyof typeof VEHICLE_CLASS_LABELS, string][]
const LOCATION_TYPES = Object.entries(LOCATION_TYPE_LABELS) as [keyof typeof LOCATION_TYPE_LABELS, string][]

const VARIANT_OPTIONS: Partial<Record<(typeof SERVICE_TYPES)[number], { value: string; label: string }[]>> = {
  mount_balance: [
    { value: 'stock',       label: 'Stock' },
    { value: 'aftermarket', label: 'Aftermarket' },
    { value: 'lt',          label: 'Light Truck (LT)' },
    { value: 'extreme',     label: 'Extreme / Off-Road' },
    { value: 'beadlock',    label: 'Beadlock' },
  ],
  tire_repair: [
    { value: 'plug',         label: 'Plug' },
    { value: 'patch',        label: 'Patch' },
    { value: 'plug_n_patch', label: 'Plug & Patch' },
  ],
  wheel_repair: [
    { value: 'oem_crack',      label: 'OEM Crack' },
    { value: 'aftermarket',    label: 'Aftermarket' },
    { value: 'aluminum_bent',  label: 'Aluminum Bent' },
    { value: 'steel_bent',     label: 'Steel Bent' },
  ],
}

// Strips formatting and normalizes to E.164 (+1XXXXXXXXXX) on blur.
// Operators can type (703) 555-1234, 703-555-1234, or 7035551234.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  return raw
}

const INPUT =
  'mt-1.5 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-3 text-base text-white ' +
  'placeholder:text-[#48484A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trs-gold/70'

const LABEL = 'block text-sm font-medium text-[#AEAEB2]'

const HINT = 'mt-1 text-xs text-[#636366]'

const PAD = 'pb-[max(7rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))]'

function Req() {
  return <span className="ml-0.5 text-red-400" aria-hidden>*</span>
}

export function NewJobForm() {
  const router = useRouter()
  const [techs, setTechs] = useState<TechOpt[]>([])
  const [busy, setBusy] = useState(false)

  const [customer_name, setCustomerName] = useState('')
  const [customer_phone, setCustomerPhone] = useState('')
  const [service_type, setServiceType] = useState<(typeof SERVICE_TYPES)[number]>('tire_repair')
  const [service_variant, setServiceVariant] = useState('')
  const [vehicle_class, setVehicleClass] = useState('')
  const [vehicle_year, setVehicleYear] = useState('')
  const [vehicle_make, setVehicleMake] = useState('')
  const [vehicle_model, setVehicleModel] = useState('')
  const [location_type, setLocationType] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [price_dollars, setPriceDollars] = useState('')
  const [assigned_tech_id, setAssignedTechId] = useState('')

  const variantOpts = VARIANT_OPTIONS[service_type] ?? []

  useEffect(() => { setServiceVariant('') }, [service_type])

  const loadTechs = useCallback(async () => {
    const client = createClient()
    const { data: session } = await client.auth.getUser()
    const uid = session.user?.id
    if (!uid) return
    const { data: me } = await client.from('users').select('tenant_id').eq('id', uid).maybeSingle()
    if (!me?.tenant_id) return
    const { data } = await client
      .from('users')
      .select('id,name')
      .eq('tenant_id', me.tenant_id)
      .eq('role', 'tech')
      .eq('is_active', true)
      .order('name')
    if (data) setTechs(data as TechOpt[])
  }, [])

  useEffect(() => { void loadTechs() }, [loadTechs])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const yearNum = vehicle_year.trim() ? Number(vehicle_year) : null
      const price_cents =
        price_dollars.trim() === ''
          ? null
          : Math.round(Number.parseFloat(price_dollars) * 100)
      if (price_dollars.trim() !== '' && (Number.isNaN(price_cents) || price_cents! < 0)) {
        toast.error('Enter a valid price')
        setBusy(false)
        return
      }

      const body: Record<string, unknown> = {
        customer_name: customer_name.trim(),
        customer_phone: normalizePhone(customer_phone.trim()),
        address: address.trim(),
        service_type,
        source: 'manual',
      }
      if (service_variant) body.service_variant = service_variant
      if (vehicle_class) body.vehicle_class = vehicle_class
      if (location_type) body.location_type = location_type
      if (yearNum != null && !Number.isNaN(yearNum)) body.vehicle_year = yearNum
      if (vehicle_make.trim()) body.vehicle_make = vehicle_make.trim()
      if (vehicle_model.trim()) body.vehicle_model = vehicle_model.trim()
      if (price_cents != null) body.price_cents = price_cents
      if (notes.trim()) body.notes = notes.trim()
      if (assigned_tech_id) body.assigned_tech_id = assigned_tech_id

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errBody.error ?? 'Failed to create job')
      }
      const job = (await res.json()) as Job
      toast.success('Job created')
      router.replace(`/dashboard/jobs/${job.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create job')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`px-4 pt-2 ${PAD}`}>
      <div className="mx-auto max-w-lg">
        <Link href="/dashboard/jobs" className="text-sm text-trs-gold hover:underline">
          ← Back to jobs
        </Link>
        <h1 className="mt-4 font-display text-2xl font-bold text-white">New job</h1>
        <p className="mt-1 text-sm text-[#8E8E93]">
          Fields marked <span className="text-red-400">*</span> are required.
        </p>

        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-8" noValidate>

          {/* ── Customer ── */}
          <section aria-labelledby="section-customer">
            <h2 id="section-customer" className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#636366]">
              Customer
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="customer_name" className={LABEL}>
                  Full name<Req />
                </label>
                <input
                  id="customer_name"
                  required
                  autoComplete="name"
                  autoCapitalize="words"
                  placeholder="John Smith"
                  value={customer_name}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={INPUT}
                />
              </div>

              <div>
                <label htmlFor="customer_phone" className={LABEL}>
                  Phone number<Req />
                </label>
                <input
                  id="customer_phone"
                  required
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="(703) 555-1234"
                  value={customer_phone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onBlur={(e) => setCustomerPhone(normalizePhone(e.target.value))}
                  className={INPUT}
                />
                <p className={HINT}>US numbers only — auto-formats to E.164 when you move on.</p>
              </div>
            </div>
          </section>

          {/* ── Service ── */}
          <section aria-labelledby="section-service">
            <h2 id="section-service" className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#636366]">
              Service
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="service_type" className={LABEL}>
                  Service type<Req />
                </label>
                <select
                  id="service_type"
                  required
                  value={service_type}
                  onChange={(e) => setServiceType(e.target.value as (typeof SERVICE_TYPES)[number])}
                  className={INPUT}
                >
                  {SERVICE_TYPES.map((st) => (
                    <option key={st} value={st}>{SERVICE_TYPE_LABELS[st]}</option>
                  ))}
                </select>
              </div>

              {variantOpts.length > 0 && (
                <div>
                  <label htmlFor="service_variant" className={LABEL}>
                    Variant
                  </label>
                  <select
                    id="service_variant"
                    value={service_variant}
                    onChange={(e) => setServiceVariant(e.target.value)}
                    className={INPUT}
                  >
                    <option value="">— Select variant —</option>
                    {variantOpts.map((v) => (
                      <option key={v.value} value={v.value}>{v.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* ── Vehicle ── */}
          <section aria-labelledby="section-vehicle">
            <h2 id="section-vehicle" className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#636366]">
              Vehicle
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="vehicle_class" className={LABEL}>
                  Vehicle class<Req />
                </label>
                <select
                  id="vehicle_class"
                  required
                  value={vehicle_class}
                  onChange={(e) => setVehicleClass(e.target.value)}
                  className={INPUT}
                >
                  <option value="">— Select class —</option>
                  {VEHICLE_CLASSES.map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
                <p className={HINT}>Used to calculate the quote automatically.</p>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2">
                  <label htmlFor="vehicle_year" className={LABEL}>Year</label>
                  <input
                    id="vehicle_year"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="2022"
                    value={vehicle_year}
                    onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, ''))}
                    className={INPUT}
                  />
                </div>
                <div className="col-span-3">
                  <label htmlFor="vehicle_make" className={LABEL}>Make</label>
                  <input
                    id="vehicle_make"
                    autoCapitalize="words"
                    placeholder="Toyota"
                    value={vehicle_make}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    className={INPUT}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vehicle_model" className={LABEL}>Model</label>
                <input
                  id="vehicle_model"
                  autoCapitalize="words"
                  placeholder="Camry"
                  value={vehicle_model}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
          </section>

          {/* ── Location ── */}
          <section aria-labelledby="section-location">
            <h2 id="section-location" className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#636366]">
              Location
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="location_type" className={LABEL}>
                  Location type<Req />
                </label>
                <select
                  id="location_type"
                  required
                  value={location_type}
                  onChange={(e) => setLocationType(e.target.value)}
                  className={INPUT}
                >
                  <option value="">— Select type —</option>
                  {LOCATION_TYPES.map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
                <p className={HINT}>Highway jobs carry a higher dispatch fee.</p>
              </div>

              <div>
                <label htmlFor="address" className={LABEL}>
                  Address<Req />
                </label>
                <input
                  id="address"
                  required
                  type="text"
                  autoComplete="street-address"
                  placeholder="1234 Main St, Woodbridge, VA 22191"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
          </section>

          {/* ── Details ── */}
          <section aria-labelledby="section-details">
            <h2 id="section-details" className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#636366]">
              Details
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="notes" className={LABEL}>Notes</label>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="Flat on driver's front, wheel locks present…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={INPUT}
                />
              </div>

              <div>
                <label htmlFor="price_dollars" className={LABEL}>Price (USD)</label>
                <input
                  id="price_dollars"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={price_dollars}
                  onChange={(e) => setPriceDollars(e.target.value)}
                  className={INPUT}
                />
                <p className={HINT}>Leave blank — pricing engine will calculate from vehicle class + location.</p>
              </div>

              <div>
                <label htmlFor="assigned_tech" className={LABEL}>Assign technician</label>
                <select
                  id="assigned_tech"
                  value={assigned_tech_id}
                  onChange={(e) => setAssignedTechId(e.target.value)}
                  className={INPUT}
                >
                  <option value="">— Unassigned —</option>
                  {techs.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={busy}
            aria-busy={busy}
            className="w-full rounded-xl bg-trs-gold py-3.5 text-base font-semibold text-black transition-transform hover:bg-trs-gold-dark active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create job'}
          </button>
        </form>
      </div>
    </div>
  )
}
