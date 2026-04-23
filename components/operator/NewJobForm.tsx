'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/types/domain'
import { SERVICE_TYPE_LABELS } from '@/types/enums'

type TechOpt = { id: string; name: string }

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS) as (keyof typeof SERVICE_TYPE_LABELS)[]

const PAD = 'pb-[max(7rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))]'

export function NewJobForm() {
  const router = useRouter()
  const [techs, setTechs] = useState<TechOpt[]>([])
  const [busy, setBusy] = useState(false)
  const [customer_name, setCustomerName] = useState('')
  const [customer_phone, setCustomerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [vehicle_year, setVehicleYear] = useState('')
  const [vehicle_make, setVehicleMake] = useState('')
  const [vehicle_model, setVehicleModel] = useState('')
  const [service_type, setServiceType] = useState<(typeof SERVICE_TYPES)[number]>('tire_repair')
  const [price_dollars, setPriceDollars] = useState('')
  const [notes, setNotes] = useState('')
  const [assigned_tech_id, setAssignedTechId] = useState('')

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

  useEffect(() => {
    void loadTechs()
  }, [loadTechs])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const yearNum = vehicle_year.trim() ? Number(vehicle_year) : null
      const price_cents =
        price_dollars.trim() === '' ? null : Math.round(Number.parseFloat(price_dollars) * 100)
      if (price_dollars.trim() !== '' && (Number.isNaN(price_cents) || price_cents! < 0)) {
        toast.error('Enter a valid price')
        setBusy(false)
        return
      }
      const body: Record<string, unknown> = {
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        address: address.trim(),
        service_type,
        source: 'manual',
      }
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
        <p className="mt-1 text-sm text-[#8E8E93]">Phone-in or walk-up — US +1 E.164</p>

        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
          <label className="block text-sm text-[#8E8E93]">
            Customer name
            <input
              required
              value={customer_name}
              onChange={(e) => setCustomerName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-[#8E8E93]">
            Phone (+1XXXXXXXXXX)
            <input
              required
              placeholder="+17035551234"
              value={customer_phone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-[#8E8E93]">
            Address
            <textarea
              required
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="mt-1 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-2 text-white"
            />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="block text-sm text-[#8E8E93]">
              Year
              <input
                value={vehicle_year}
                onChange={(e) => setVehicleYear(e.target.value)}
                className="mt-1 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-2 py-2 text-sm text-white"
              />
            </label>
            <label className="col-span-2 block text-sm text-[#8E8E93]">
              Make
              <input
                value={vehicle_make}
                onChange={(e) => setVehicleMake(e.target.value)}
                className="mt-1 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-2 py-2 text-sm text-white"
              />
            </label>
          </div>
          <label className="block text-sm text-[#8E8E93]">
            Model
            <input
              value={vehicle_model}
              onChange={(e) => setVehicleModel(e.target.value)}
              className="mt-1 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-[#8E8E93]">
            Service
            <select
              value={service_type}
              onChange={(e) => setServiceType(e.target.value as (typeof SERVICE_TYPES)[number])}
              className="mt-1 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-2 text-white"
            >
              {SERVICE_TYPES.map((st) => (
                <option key={st} value={st}>
                  {SERVICE_TYPE_LABELS[st]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-[#8E8E93]">
            Price (USD, optional)
            <input
              type="number"
              step="0.01"
              min={0}
              value={price_dollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              className="mt-1 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-[#8E8E93]">
            Notes
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm text-[#8E8E93]">
            Assign technician (optional)
            <select
              value={assigned_tech_id}
              onChange={(e) => setAssignedTechId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-2 text-white"
            >
              <option value="">— Unassigned —</option>
              {techs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-trs-gold py-3 text-sm font-semibold text-black hover:bg-trs-gold-dark disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create job'}
          </button>
        </form>
      </div>
    </div>
  )
}
