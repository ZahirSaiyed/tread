'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle, Clock, MessageSquare } from 'lucide-react'
import type { JobDetail } from '@/types/api'
import type { JobEvent } from '@/types/domain'
import type { JobStatus } from '@/types/enums'
import { JOB_STATUS_LABELS, SERVICE_TYPE_LABELS } from '@/types/enums'
import { createClient } from '@/lib/supabase/client'

type ReviewRequestRow = {
  id: string
  sent_at: string
  clicked_at: string | null
}

const SERVICE_TYPES = Object.keys(SERVICE_TYPE_LABELS) as (keyof typeof SERVICE_TYPE_LABELS)[]

const PAD = 'pb-[max(7rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))]'

function formatUsd(cents: number | null): string {
  if (cents == null) return '—'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function timelineSummary(event: JobEvent): string {
  const p = event.payload
  switch (event.event_type) {
    case 'job_created':
      return 'Job created'
    case 'tech_assigned':
      return 'Technician assigned'
    case 'status_changed': {
      const from = typeof p.from === 'string' ? JOB_STATUS_LABELS[p.from as JobStatus] ?? p.from : '?'
      const to = typeof p.to === 'string' ? JOB_STATUS_LABELS[p.to as JobStatus] ?? p.to : '?'
      const reason = typeof p.reason === 'string' ? ` (${p.reason})` : ''
      return `Status ${from} → ${to}${reason}`
    }
    case 'job_updated':
      return 'Job details updated'
    default:
      return event.event_type.replace(/_/g, ' ')
  }
}

export function OperatorJobDetail({ jobId }: { jobId: string }) {
  const [detail, setDetail] = useState<JobDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelBusy, setCancelBusy] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const [reviewRequest, setReviewRequest] = useState<ReviewRequestRow | null | undefined>(undefined)
  const [customer_name, setCustomerName] = useState('')
  const [customer_phone, setCustomerPhone] = useState('')
  const [address, setAddress] = useState('')
  const [vehicle_year, setVehicleYear] = useState('')
  const [vehicle_make, setVehicleMake] = useState('')
  const [vehicle_model, setVehicleModel] = useState('')
  const [service_type, setServiceType] = useState<(typeof SERVICE_TYPES)[number]>('tire_repair')
  const [price_dollars, setPriceDollars] = useState('')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to load job')
      }
      const j = (await res.json()) as JobDetail
      setDetail(j)
      setCustomerName(j.customer_name)
      setCustomerPhone(j.customer_phone)
      setAddress(j.address)
      setVehicleYear(j.vehicle_year != null ? String(j.vehicle_year) : '')
      setVehicleMake(j.vehicle_make ?? '')
      setVehicleModel(j.vehicle_model ?? '')
      setServiceType(j.service_type)
      setPriceDollars(j.price_cents != null ? String(j.price_cents / 100) : '')
      setNotes(j.notes ?? '')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load job')
      setDetail(null)
    } finally {
      setLoading(false)
    }
  }, [jobId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const client = createClient()
    void client
      .from('review_requests')
      .select('id, sent_at, clicked_at')
      .eq('job_id', jobId)
      .maybeSingle()
      .then(({ data }) => setReviewRequest(data ?? null))
  }, [jobId])

  const editable = detail?.status === 'pending' || detail?.status === 'assigned'

  const saveEdits = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detail || !editable) return
    setEditBusy(true)
    try {
      const yearNum = vehicle_year.trim() ? Number(vehicle_year) : null
      const price_cents =
        price_dollars.trim() === '' ? null : Math.round(Number.parseFloat(price_dollars) * 100)
      if (price_dollars.trim() !== '' && (Number.isNaN(price_cents) || price_cents! < 0)) {
        toast.error('Enter a valid price')
        setEditBusy(false)
        return
      }
      const body: Record<string, unknown> = {
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        address: address.trim(),
        service_type,
      }
      if (yearNum != null && !Number.isNaN(yearNum)) body.vehicle_year = yearNum
      else body.vehicle_year = null
      body.vehicle_make = vehicle_make.trim() || null
      body.vehicle_model = vehicle_model.trim() || null
      body.price_cents = price_cents
      body.notes = notes.trim() || null

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errBody.error ?? 'Update failed')
      }
      toast.success('Saved')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setEditBusy(false)
    }
  }

  const submitCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Cancellation reason is required')
      return
    }
    setCancelBusy(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled', cancellation_reason: cancelReason.trim() }),
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errBody.error ?? 'Cancel failed')
      }
      toast.success('Job cancelled')
      setCancelOpen(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cancel failed')
    } finally {
      setCancelBusy(false)
    }
  }

  if (loading) {
    return (
      <div className={`space-y-4 px-4 pt-4 ${PAD}`}>
        <div className="h-4 w-16 animate-pulse rounded bg-trs-slate" />
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-trs-slate" />
          <div className="h-4 w-32 animate-pulse rounded bg-trs-charcoal" />
        </div>
        <div className="h-44 animate-pulse rounded-2xl bg-trs-charcoal" />
        <div className="h-32 animate-pulse rounded-2xl bg-trs-charcoal" />
        <div className="h-48 animate-pulse rounded-2xl bg-trs-charcoal" />
      </div>
    )
  }

  if (!detail) {
    return (
      <div className={`px-4 pt-6 ${PAD}`}>
        <Link href="/dashboard/jobs" className="text-trs-gold hover:underline">
          ← Jobs
        </Link>
        <p className="mt-4 text-[#8E8E93]">Job not found.</p>
      </div>
    )
  }

  const canCancel =
    detail.status !== 'complete' && detail.status !== 'cancelled'

  return (
    <div className={`min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pt-2 ${PAD}`}>
      <Link href="/dashboard/jobs" className="text-sm text-trs-gold hover:underline">
        ← Jobs
      </Link>

      <header>
        <h1 className="font-display text-2xl font-bold text-white">{detail.customer_name}</h1>
        <p className="mt-1 text-sm text-[#8E8E93]">
          {SERVICE_TYPE_LABELS[detail.service_type]} · {JOB_STATUS_LABELS[detail.status]}
        </p>
        <p className="mt-2 font-mono text-xs text-[#48484A]">{detail.id}</p>
      </header>

      <section className="rounded-2xl border border-trs-slate bg-trs-charcoal p-4">
        <h2 className="text-sm font-semibold text-white">Customer & job</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-[#8E8E93]">Phone</dt>
            <dd className="text-white">{detail.customer_phone}</dd>
          </div>
          <div>
            <dt className="text-[#8E8E93]">Address</dt>
            <dd className="text-white">{detail.address}</dd>
          </div>
          <div>
            <dt className="text-[#8E8E93]">Vehicle</dt>
            <dd className="text-white">
              {[detail.vehicle_year, detail.vehicle_make, detail.vehicle_model].filter(Boolean).join(' ') || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[#8E8E93]">Price</dt>
            <dd className="font-mono text-white">{formatUsd(detail.price_cents)}</dd>
          </div>
          {detail.notes ? (
            <div>
              <dt className="text-[#8E8E93]">Notes</dt>
              <dd className="text-white">{detail.notes}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {editable ? (
        <section className="rounded-2xl border border-trs-slate bg-trs-charcoal p-4">
          <h2 className="text-sm font-semibold text-white">Edit (before en route)</h2>
          <form onSubmit={(e) => void saveEdits(e)} className="mt-4 space-y-3">
            <label className="block text-sm text-[#AEAEB2]">
              Name
              <input
                autoComplete="name"
                autoCapitalize="words"
                value={customer_name}
                onChange={(e) => setCustomerName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-3 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trs-gold/70"
              />
            </label>
            <label className="block text-sm text-[#AEAEB2]">
              Phone
              <input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={customer_phone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-3 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trs-gold/70"
              />
            </label>
            <label className="block text-sm text-[#AEAEB2]">
              Address
              <input
                type="text"
                autoComplete="street-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-3 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trs-gold/70"
              />
            </label>
            <div className="grid grid-cols-5 gap-2">
              <div className="col-span-2">
                <label className="block text-sm text-[#AEAEB2]">
                  Year
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="2022"
                    value={vehicle_year}
                    onChange={(e) => setVehicleYear(e.target.value.replace(/\D/g, ''))}
                    className="mt-1.5 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-3 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trs-gold/70"
                  />
                </label>
              </div>
              <div className="col-span-3">
                <label className="block text-sm text-[#AEAEB2]">
                  Make
                  <input
                    autoCapitalize="words"
                    placeholder="Toyota"
                    value={vehicle_make}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-3 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trs-gold/70"
                  />
                </label>
              </div>
            </div>
            <label className="block text-sm text-[#AEAEB2]">
              Model
              <input
                autoCapitalize="words"
                placeholder="Camry"
                value={vehicle_model}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-3 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trs-gold/70"
              />
            </label>
            <label className="block text-sm text-[#AEAEB2]">
              Service
              <select
                value={service_type}
                onChange={(e) => setServiceType(e.target.value as (typeof SERVICE_TYPES)[number])}
                className="mt-1.5 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-3 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trs-gold/70"
              >
                {SERVICE_TYPES.map((st) => (
                  <option key={st} value={st}>{SERVICE_TYPE_LABELS[st]}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-[#AEAEB2]">
              Price (USD)
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={price_dollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-3 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trs-gold/70"
              />
            </label>
            <label className="block text-sm text-[#AEAEB2]">
              Notes
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-3 text-base text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trs-gold/70"
              />
            </label>
            <button
              type="submit"
              disabled={editBusy}
              className="w-full rounded-xl bg-trs-gold py-3.5 text-base font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {editBusy ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-trs-slate bg-trs-charcoal p-4">
        <h2 className="text-sm font-semibold text-white">Photos</h2>
        {detail.photos.length === 0 ? (
          <p className="mt-3 text-sm text-[#8E8E93]">No photos yet.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {detail.photos.map((ph) => (
              <li key={ph.id} className="overflow-hidden rounded-xl border border-trs-slate">
                <a href={ph.storage_url} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ph.storage_url} alt={ph.photo_type} className="aspect-square w-full object-cover" />
                </a>
                <p className="bg-black/60 px-2 py-1 text-center text-xs capitalize text-[#8E8E93]">
                  {ph.photo_type}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-trs-slate bg-trs-charcoal p-4">
        <h2 className="text-sm font-semibold text-white">Timeline</h2>
        <ol className="mt-4 space-y-4 border-l border-trs-slate pl-4">
          {detail.events.map((ev) => (
            <li key={ev.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-trs-gold" />
              <p className="text-sm text-white">{timelineSummary(ev)}</p>
              <p className="mt-1 font-mono text-xs text-[#8E8E93]">
                {new Date(ev.created_at).toLocaleString()}
                {ev.created_by_user?.name ? ` · ${ev.created_by_user.name}` : ''}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Review request status — shown on completed jobs */}
      {detail.status === 'complete' && reviewRequest !== undefined && (
        <section className="rounded-2xl border border-trs-slate bg-trs-charcoal p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <MessageSquare size={15} className="text-trs-gold" aria-hidden />
            Review request
          </h2>
          {reviewRequest === null ? (
            <p className="mt-3 text-sm text-[#8E8E93]">Not sent yet.</p>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="shrink-0 text-status-complete" aria-hidden />
                <dt className="text-[#8E8E93]">Sent</dt>
                <dd className="font-mono text-white">
                  {new Date(reviewRequest.sent_at).toLocaleString()}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                {reviewRequest.clicked_at ? (
                  <CheckCircle size={14} className="shrink-0 text-trs-gold" aria-hidden />
                ) : (
                  <Clock size={14} className="shrink-0 text-[#636366]" aria-hidden />
                )}
                <dt className="text-[#8E8E93]">Clicked</dt>
                <dd className={reviewRequest.clicked_at ? 'font-mono text-trs-gold' : 'text-[#636366]'}>
                  {reviewRequest.clicked_at
                    ? new Date(reviewRequest.clicked_at).toLocaleString()
                    : 'Not yet'}
                </dd>
              </div>
            </dl>
          )}
        </section>
      )}

      {canCancel ? (
        <div className="pb-8">
          <button
            type="button"
            onClick={() => setCancelOpen(true)}
            className="w-full rounded-xl border border-status-urgent py-3 text-sm font-semibold text-status-urgent hover:bg-status-urgent/10"
          >
            Cancel job…
          </button>
        </div>
      ) : null}

      {cancelOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal
          onClick={() => setCancelOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-trs-slate bg-trs-charcoal p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white">Cancel job</h3>
            <p className="mt-1 text-sm text-[#8E8E93]">Reason is required for the audit trail.</p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-xl border border-trs-slate bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="Reason…"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-trs-slate py-3 text-sm text-[#8E8E93]"
                onClick={() => setCancelOpen(false)}
              >
                Back
              </button>
              <button
                type="button"
                disabled={cancelBusy}
                className="flex-1 rounded-xl bg-status-urgent py-3 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void submitCancel()}
              >
                {cancelBusy ? '…' : 'Confirm cancel'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
