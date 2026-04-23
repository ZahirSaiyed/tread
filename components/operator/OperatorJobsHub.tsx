'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { Job } from '@/types/domain'
import type { PaginatedResponse } from '@/types/api'
import type { JobStatus, ServiceType } from '@/types/enums'
import { JOB_STATUS_LABELS, SERVICE_TYPE_LABELS } from '@/types/enums'

type TechOpt = { id: string; name: string }

const JOB_STATUSES_ORDERED = Object.keys(JOB_STATUS_LABELS) as JobStatus[]
const SERVICE_TYPES_ORDERED = Object.keys(SERVICE_TYPE_LABELS) as ServiceType[]

const OPEN_STATUSES: JobStatus[] = ['pending', 'assigned', 'en_route', 'on_site']

function statusesFromParam(raw: string | null): Set<JobStatus> {
  const s = new Set<JobStatus>()
  if (!raw?.trim()) return s
  for (const part of raw.split(',')) {
    const p = part.trim() as JobStatus
    if (p in JOB_STATUS_LABELS) s.add(p)
  }
  return s
}

function serviceTypesFromParam(raw: string | null): Set<ServiceType> {
  const s = new Set<ServiceType>()
  if (!raw?.trim()) return s
  for (const part of raw.split(',')) {
    const p = part.trim() as ServiceType
    if (p in SERVICE_TYPE_LABELS) s.add(p)
  }
  return s
}

const LIST_PAD =
  'pb-[max(7rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))]'

function formatUsd(cents: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(
    cents / 100,
  )
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfWeekISO(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d.setDate(diff))
  const y = mon.getFullYear()
  const m = String(mon.getMonth() + 1).padStart(2, '0')
  const dd = String(mon.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function formatShortDate(raw: string): string {
  const d = raw.includes('T') ? new Date(raw) : new Date(`${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Human-readable summary of filters currently in the URL (applied state). */
function appliedFilterChips(
  urlParams: URLSearchParams,
  techs: TechOpt[],
): { chips: string[]; hasFilters: boolean } {
  const chips: string[] = []
  const stRaw = urlParams.get('status')
  if (stRaw?.trim()) {
    const ids = stRaw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean) as JobStatus[]
    const valid = ids.filter((id) => id in JOB_STATUS_LABELS)
    if (valid.length === 1) chips.push(JOB_STATUS_LABELS[valid[0]])
    else if (valid.length > 1) chips.push(`${valid.length} statuses`)
  }
  const svRaw = urlParams.get('service_type')
  if (svRaw?.trim()) {
    const ids = svRaw
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean) as ServiceType[]
    const valid = ids.filter((id) => id in SERVICE_TYPE_LABELS)
    if (valid.length === 1) chips.push(SERVICE_TYPE_LABELS[valid[0]])
    else if (valid.length > 1) chips.push(`${valid.length} services`)
  }
  if (urlParams.get('unassigned_only') === 'true' || urlParams.get('unassigned_only') === '1') {
    chips.push('Unassigned')
  }
  const tid = urlParams.get('assigned_tech_id')
  if (tid) {
    chips.push(techs.find((t) => t.id === tid)?.name ?? 'Technician')
  }
  const cf = urlParams.get('created_from')
  const ct = urlParams.get('created_to')
  if (cf && ct) chips.push(`${formatShortDate(cf)}–${formatShortDate(ct)}`)
  else if (cf) chips.push(`From ${formatShortDate(cf)}`)
  else if (ct) chips.push(`Through ${formatShortDate(ct)}`)

  return { chips, hasFilters: chips.length > 0 }
}

export function OperatorJobsHub() {
  const router = useRouter()
  const urlParams = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>([])
  const [count, setCount] = useState(0)
  const [pageSize] = useState(20)
  const [loading, setLoading] = useState(true)
  const [techs, setTechs] = useState<TechOpt[]>([])
  const [revenue, setRevenue] = useState<{ totalCents: number; jobCount: number } | null>(null)

  const [selectedStatuses, setSelectedStatuses] = useState<Set<JobStatus>>(() => new Set())
  const [selectedServiceTypes, setSelectedServiceTypes] = useState<Set<ServiceType>>(() => new Set())
  const [assignedTechId, setAssignedTechId] = useState('')
  const [unassignedOnly, setUnassignedOnly] = useState(false)
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  /** Collapsed by default — list first, like trading apps that tuck search/filter behind one control. */
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  const page = Math.max(1, Number(urlParams.get('page') ?? '1') || 1)

  const syncFormFromUrl = useCallback(() => {
    setSelectedStatuses(statusesFromParam(urlParams.get('status')))
    setSelectedServiceTypes(serviceTypesFromParam(urlParams.get('service_type')))
    setAssignedTechId(urlParams.get('assigned_tech_id') ?? '')
    setUnassignedOnly(urlParams.get('unassigned_only') === 'true' || urlParams.get('unassigned_only') === '1')
    setCreatedFrom(urlParams.get('created_from') ?? '')
    setCreatedTo(urlParams.get('created_to') ?? '')
  }, [urlParams])

  useEffect(() => {
    syncFormFromUrl()
  }, [syncFormFromUrl])

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const sp = new URLSearchParams(urlParams.toString())
      sp.set('page', String(page))
      sp.set('pageSize', String(pageSize))
      const res = await fetch(`/api/jobs?${sp.toString()}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to load jobs')
      }
      const json = (await res.json()) as PaginatedResponse<Job>
      setJobs(json.data ?? [])
      setCount(json.count ?? 0)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load jobs')
    } finally {
      setLoading(false)
    }
  }, [urlParams, page, pageSize])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const loadRevenue = useCallback(async (from: string, to: string) => {
    try {
      const res = await fetch(`/api/jobs/revenue?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to load revenue')
      }
      const json = (await res.json()) as { totalCents: number; jobCount: number }
      setRevenue(json)
    } catch {
      setRevenue(null)
    }
  }, [])

  useEffect(() => {
    void loadRevenue(startOfWeekISO(), todayISO())
  }, [loadRevenue])

  const toggleStatus = (st: JobStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(st)) next.delete(st)
      else next.add(st)
      return next
    })
  }

  const toggleServiceType = (svc: ServiceType) => {
    setSelectedServiceTypes((prev) => {
      const next = new Set(prev)
      if (next.has(svc)) next.delete(svc)
      else next.add(svc)
      return next
    })
  }

  const applyFilters = () => {
    const sp = new URLSearchParams()
    if (selectedStatuses.size > 0) {
      sp.set('status', Array.from(selectedStatuses).join(','))
    }
    if (selectedServiceTypes.size > 0) {
      sp.set('service_type', Array.from(selectedServiceTypes).join(','))
    }
    if (assignedTechId && !unassignedOnly) sp.set('assigned_tech_id', assignedTechId)
    if (unassignedOnly) sp.set('unassigned_only', 'true')
    if (createdFrom.trim()) sp.set('created_from', createdFrom.trim())
    if (createdTo.trim()) sp.set('created_to', createdTo.trim())
    sp.set('page', '1')
    router.replace(`/dashboard/jobs?${sp.toString()}`)
    setFiltersOpen(false)
  }

  const resetFilters = () => {
    setSelectedStatuses(new Set())
    setSelectedServiceTypes(new Set())
    setAssignedTechId('')
    setUnassignedOnly(false)
    setCreatedFrom('')
    setCreatedTo('')
    router.replace('/dashboard/jobs?page=1')
    setFiltersOpen(false)
  }

  const applied = useMemo(
    () => appliedFilterChips(urlParams, techs),
    [urlParams, techs],
  )

  const goPage = (nextPage: number) => {
    const sp = new URLSearchParams(urlParams.toString())
    sp.set('page', String(nextPage))
    router.replace(`/dashboard/jobs?${sp.toString()}`)
  }

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / pageSize)), [count, pageSize])

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${LIST_PAD}`}>
      <div className="shrink-0 space-y-3 border-b border-white/[0.06] px-4 pb-3 pt-2">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-white">Jobs</h1>
            <p className="mt-1 text-sm text-[#8E8E93]">
              Newest first · {pageSize} per page. Tap <span className="text-white/90">Filters</span> when you need
              to narrow the list.
            </p>
          </div>
          <Link
            href="/dashboard/jobs/new"
            className="inline-flex min-h-touch shrink-0 items-center justify-center rounded-xl bg-trs-gold px-4 text-sm font-semibold text-black hover:bg-trs-gold-dark"
          >
            New job
          </Link>
        </header>

        {revenue ? (
          <section
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-2.5"
            aria-label="Revenue summary"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[#8E8E93]">Completed · week</p>
              <p className="font-mono text-lg font-semibold leading-tight text-white">{formatUsd(revenue.totalCents)}</p>
              <p className="text-[11px] text-[#8E8E93]">{revenue.jobCount} jobs</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                className="rounded-lg border border-trs-slate px-2.5 py-1.5 text-[11px] font-medium text-trs-gold hover:border-trs-gold"
                onClick={() => void loadRevenue(startOfWeekISO(), todayISO())}
              >
                Week
              </button>
              <button
                type="button"
                className="rounded-lg border border-trs-slate px-2.5 py-1.5 text-[11px] font-medium text-trs-gold hover:border-trs-gold"
                onClick={() => {
                  const d = new Date()
                  const first = new Date(d.getFullYear(), d.getMonth(), 1)
                  const y = first.getFullYear()
                  const m = String(first.getMonth() + 1).padStart(2, '0')
                  void loadRevenue(`${y}-${m}-01`, todayISO())
                }}
              >
                MTD
              </button>
            </div>
          </section>
        ) : null}

        {/* Collapsed: one tappable row. Expanded: full form (Robinhood-style "list first, refine in a sheet-like block"). */}
        {!filtersOpen ? (
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="flex w-full min-h-touch items-center gap-3 rounded-xl border border-trs-slate bg-trs-charcoal px-3 py-2.5 text-left transition-colors hover:border-[#48484A] active:bg-trs-slate/30"
            aria-expanded={false}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-trs-slate/80">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-trs-gold" aria-hidden>
                <path
                  d="M4 6h16M7 12h10M10 18h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#8E8E93]">Filters</p>
              <p className="truncate text-sm text-white">
                {applied.hasFilters ? applied.chips.join(' · ') : 'All jobs'}
              </p>
              <p className="truncate text-[11px] text-[#48484A]">
                {applied.hasFilters ? `${count} matching` : `${count} total`}
              </p>
            </div>
            <span className="shrink-0 text-[#8E8E93]" aria-hidden>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        ) : (
        <section className="space-y-5 rounded-2xl border border-trs-slate bg-trs-charcoal p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Filters</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg px-2 py-1.5 text-xs font-medium text-[#8E8E93] hover:bg-white/5 hover:text-white"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
              >
                Done
              </button>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-[#8E8E93]">Status</legend>
            <p className="text-[11px] leading-snug text-[#48484A]">
              Leave none checked to show every status. Check one or more to narrow the list.
            </p>
            <div className="flex flex-wrap gap-2">
              {JOB_STATUSES_ORDERED.map((st) => {
                const on = selectedStatuses.has(st)
                return (
                  <label
                    key={st}
                    className={`flex min-h-touch cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                      on ? 'border-trs-gold bg-trs-gold/10 text-white' : 'border-trs-slate text-[#8E8E93] hover:border-[#48484A]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleStatus(st)}
                      className="h-4 w-4 rounded border-trs-slate bg-black/40 text-trs-gold focus:ring-trs-gold"
                    />
                    {JOB_STATUS_LABELS[st]}
                  </label>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedStatuses(new Set(OPEN_STATUSES))}
                className="rounded-lg border border-trs-slate px-3 py-2 text-xs font-medium text-trs-gold hover:border-trs-gold"
              >
                Open jobs only
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatuses(new Set())}
                className="rounded-lg border border-trs-slate px-3 py-2 text-xs font-medium text-[#8E8E93] hover:border-[#48484A] hover:text-white"
              >
                Any status
              </button>
            </div>
          </fieldset>

          <label className="flex min-h-touch cursor-pointer items-center gap-3 rounded-xl border border-trs-slate bg-black/20 px-3 py-2">
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={(e) => {
                setUnassignedOnly(e.target.checked)
                if (e.target.checked) setAssignedTechId('')
              }}
              className="h-4 w-4 rounded border-trs-slate bg-black/40 text-trs-gold focus:ring-trs-gold"
            />
            <span className="text-sm text-white">Unassigned only</span>
            <span className="ml-auto text-xs text-[#8E8E93]">No tech yet</span>
          </label>

          <label className="block text-xs font-medium text-[#8E8E93]">
            Technician
            <select
              value={assignedTechId}
              onChange={(e) => setAssignedTechId(e.target.value)}
              disabled={unassignedOnly}
              className="mt-1 w-full rounded-xl border border-trs-slate bg-black/40 px-3 py-3 text-sm text-white disabled:opacity-50"
            >
              <option value="">Any technician</option>
              {techs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-[#8E8E93]">Service type</legend>
            <p className="text-[11px] leading-snug text-[#48484A]">
              Leave none checked to include all services.
            </p>
            <div className="max-h-48 overflow-y-auto overscroll-y-contain rounded-xl border border-trs-slate bg-black/20 p-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SERVICE_TYPES_ORDERED.map((svc) => {
                const on = selectedServiceTypes.has(svc)
                return (
                  <label
                    key={svc}
                    className={`flex min-h-touch cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${
                      on ? 'bg-trs-gold/10 text-white' : 'text-[#8E8E93]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleServiceType(svc)}
                      className="h-4 w-4 shrink-0 rounded border-trs-slate bg-black/40 text-trs-gold focus:ring-trs-gold"
                    />
                    <span className="leading-tight">{SERVICE_TYPE_LABELS[svc]}</span>
                  </label>
                )
              })}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedServiceTypes(new Set())}
              className="text-xs font-medium text-[#8E8E93] underline decoration-dotted underline-offset-2 hover:text-white"
            >
              Clear service filters
            </button>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-[#8E8E93]">
              Created on or after
              <input
                type="date"
                value={createdFrom}
                onChange={(e) => setCreatedFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-trs-slate bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block text-xs font-medium text-[#8E8E93]">
              Created on or before
              <input
                type="date"
                value={createdTo}
                onChange={(e) => setCreatedTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-trs-slate bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={applyFilters}
            className="w-full rounded-xl bg-trs-gold py-3 text-sm font-semibold text-black hover:bg-trs-gold-dark"
          >
            Apply filters
          </button>
        </section>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4">
        {loading ? (
          <ul className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <li key={i} className="h-24 animate-pulse rounded-xl bg-trs-slate/60" />
            ))}
          </ul>
        ) : jobs.length === 0 ? (
          <p className="py-12 text-center text-[#8E8E93]">No jobs match these filters.</p>
        ) : (
          <ul className="space-y-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="block rounded-xl border border-trs-slate bg-trs-charcoal px-4 py-3 transition-colors hover:border-trs-gold"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-white">{job.customer_name}</p>
                    <span className="shrink-0 rounded-full bg-trs-slate px-2 py-0.5 text-xs text-[#8E8E93]">
                      {JOB_STATUS_LABELS[job.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-trs-gold">
                    {SERVICE_TYPE_LABELS[job.service_type] ?? job.service_type}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-[#8E8E93]">{job.address}</p>
                  <p className="mt-2 font-mono text-xs text-[#48484A]">{job.id.slice(0, 8)}…</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-3 pb-8">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
              className="rounded-xl border border-trs-slate px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-[#8E8E93]">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
              className="rounded-xl border border-trs-slate px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
