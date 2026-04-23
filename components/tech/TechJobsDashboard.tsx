'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { JobCard } from '@/components/tech/JobCard'
import { useTechJobsRealtime } from '@/hooks/useTechJobsRealtime'
import { createClient } from '@/lib/supabase/client'
import {
  TECH_JOBS_TAB_LABELS,
  type TechJobsTab,
  applyRealtimeJobsChange,
  computeTechJobsMetrics,
  filterJobsBySearch,
  filterJobsByTab,
  sortJobsForDashboard,
} from '@/lib/tech/jobsDashboard'
import type { Job } from '@/types/domain'
import type { PaginatedResponse } from '@/types/api'

async function fetchJobsPage(): Promise<Job[]> {
  const res = await fetch('/api/jobs?pageSize=100')
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to load jobs')
  }
  const json = (await res.json()) as PaginatedResponse<Job>
  return json.data ?? []
}

/** Bottom inset: nav bar + thumb reach + iOS home indicator. */
const LIST_SCROLL_PADDING_BOTTOM =
  'pb-[max(7rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))]'

export function TechJobsDashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TechJobsTab>('all')
  const [search, setSearch] = useState('')
  const [techUserId, setTechUserId] = useState<string | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const pullStartY = useRef<number | null>(null)
  const pullOffsetRef = useRef(0)
  const pullRaf = useRef<number | null>(null)
  const [pullOffset, setPullOffset] = useState(0)
  const [seedBusy, setSeedBusy] = useState(false)

  const schedulePullVisual = useCallback((value: number) => {
    pullOffsetRef.current = value
    if (pullRaf.current != null) return
    pullRaf.current = requestAnimationFrame(() => {
      pullRaf.current = null
      setPullOffset(pullOffsetRef.current)
    })
  }, [])

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await fetchJobsPage()
      setJobs(sortJobsForDashboard(data))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load jobs'
      setError(msg)
      if (!silent) toast.error(msg)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const seedDemoJobs = useCallback(async () => {
    setSeedBusy(true)
    try {
      const res = await fetch('/api/dev/seed-jobs', { method: 'POST' })
      const body = (await res.json()) as { error?: string; hint?: string; message?: string }
      if (!res.ok) {
        const msg =
          typeof body.hint === 'string' ? `${body.error ?? 'Failed'} — ${body.hint}` : body.error ?? 'Failed'
        toast.error(msg)
        return
      }
      toast.success(body.message ?? 'Demo jobs loaded')
      await load()
    } finally {
      setSeedBusy(false)
    }
  }, [load])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    const client = createClient()
    void client.auth.getUser().then(({ data: { user } }) => {
      if (!cancelled && user?.id) setTechUserId(user.id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const onRealtime = useCallback(
    (newRow: Record<string, unknown>) => {
      if (!techUserId) return
      setJobs((prev) => sortJobsForDashboard(applyRealtimeJobsChange(prev, newRow, techUserId)))
    },
    [techUserId],
  )

  useTechJobsRealtime(techUserId, onRealtime)

  const metrics = useMemo(() => computeTechJobsMetrics(jobs), [jobs])

  const visibleJobs = useMemo(() => {
    const byTab = filterJobsByTab(jobs, tab)
    return sortJobsForDashboard(filterJobsBySearch(byTab, search))
  }, [jobs, tab, search])

  const onTouchStart = (e: React.TouchEvent) => {
    const el = scrollRef.current
    if (!el || el.scrollTop > 0) return
    pullStartY.current = e.touches[0]?.clientY ?? null
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const el = scrollRef.current
    const start = pullStartY.current
    if (!el || start === null || el.scrollTop > 0) return
    const y = e.touches[0]?.clientY ?? start
    const dy = Math.max(0, y - start)
    if (dy > 0) schedulePullVisual(Math.min(dy, 120))
  }

  const endPull = () => {
    pullStartY.current = null
    if (pullRaf.current != null) {
      cancelAnimationFrame(pullRaf.current)
      pullRaf.current = null
    }
    if (pullOffsetRef.current >= 72) {
      void load({ silent: true })
    }
    pullOffsetRef.current = 0
    setPullOffset(0)
  }

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 space-y-4 px-4 pt-2 pb-3">
          <div className="h-8 w-40 rounded-lg bg-trs-slate animate-pulse" />
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-trs-slate animate-pulse" />
            ))}
          </div>
          <div className="h-10 rounded-xl bg-trs-slate animate-pulse" />
          <div className="h-12 rounded-xl bg-trs-slate animate-pulse" />
        </div>
        <div className={`min-h-0 flex-1 space-y-4 overflow-y-auto px-4 ${LIST_SCROLL_PADDING_BOTTOM}`}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-trs-charcoal border border-trs-slate animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error && jobs.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-28 text-center">
        <p className="text-[#8E8E93] mb-4">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-trs-gold px-6 py-3 text-sm font-semibold text-black hover:bg-trs-gold-dark transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Pull-to-refresh hint — never transforms the scroll layer (avoids fighting native scroll). */}
      <div
        className="pointer-events-none flex shrink-0 justify-center overflow-hidden transition-[height,opacity] duration-150"
        style={{
          height: pullOffset > 8 ? 28 : 0,
          opacity: pullOffset > 8 ? 1 : 0,
        }}
        aria-live="polite"
      >
        <span className="pt-1 text-xs font-medium text-trs-gold">
          {pullOffset >= 72 ? 'Release to refresh' : 'Pull to refresh'}
        </span>
      </div>

      {/* Fixed chrome: only the list scrolls beneath (mobile-native pattern). */}
      <div className="shrink-0 border-b border-white/[0.06] bg-black/90 px-4 pb-3 pt-1 backdrop-blur-md supports-[backdrop-filter]:bg-black/75">
        <header className="pb-3 pt-1">
          <h1 className="font-display text-2xl font-bold text-white">My Jobs</h1>
          <p className="mt-1 text-sm text-[#8E8E93]">Live updates from dispatch</p>
        </header>

        <section className="mb-4 grid grid-cols-3 gap-2" aria-label="Job counts">
          <MetricCard label="Today" value={metrics.createdToday} />
          <MetricCard label="Pending" value={metrics.pending} />
          <MetricCard label="Done today" value={metrics.doneToday} />
        </section>

        <label className="sr-only" htmlFor="job-search">
          Search by customer or address
        </label>
        <input
          id="job-search"
          type="search"
          enterKeyHint="search"
          placeholder="Search name or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 w-full rounded-xl border border-trs-slate bg-trs-charcoal px-4 py-3 text-base text-white placeholder:text-[#48484A] focus:border-trs-gold focus:outline-none"
          autoComplete="off"
        />

        <div
          className="-mx-4 flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Status filter"
        >
          {(Object.keys(TECH_JOBS_TAB_LABELS) as TechJobsTab[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`shrink-0 snap-start rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === key ? 'bg-trs-gold text-black' : 'bg-trs-slate text-[#8E8E93] hover:text-white'
              }`}
            >
              {TECH_JOBS_TAB_LABELS[key]}
            </button>
          ))}
        </div>

        {refreshing ? (
          <p className="pt-2 text-center text-xs text-[#8E8E93]">Refreshing…</p>
        ) : null}
      </div>

      {/* Single scroll surface for the job list — momentum + no transform jank. */}
      <div
        ref={scrollRef}
        className={`min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-y-contain ${LIST_SCROLL_PADDING_BOTTOM} px-4 [-webkit-overflow-scrolling:touch]`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={endPull}
        onTouchCancel={endPull}
      >
        {visibleJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-trs-slate bg-trs-charcoal/50 px-4 py-12 text-center">
            <p className="font-medium text-white">
              {jobs.length === 0 ? 'No active jobs today' : 'No jobs match this filter'}
            </p>
            <p className="mt-2 text-sm text-[#8E8E93]">
              {jobs.length === 0
                ? 'Waiting for assignments from dispatch.'
                : 'Try another filter or clear your search.'}
            </p>
            {jobs.length === 0 && process.env.NODE_ENV === 'development' ? (
              <div className="mt-6 rounded-xl border border-trs-slate bg-trs-charcoal px-4 py-4 text-left">
                <p className="text-xs leading-relaxed text-[#8E8E93]">
                  <span className="font-mono text-trs-gold">DEV</span>: On{' '}
                  <span className="text-white">/login</span> use the panel to sign in as{' '}
                  <strong className="text-white">Marcus</strong> once (creates the tech profile). Then load
                  sample jobs assigned to you.
                </p>
                <button
                  type="button"
                  disabled={seedBusy}
                  onClick={() => void seedDemoJobs()}
                  className="mt-3 min-h-touch w-full rounded-xl bg-trs-gold px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-trs-gold-dark disabled:opacity-50"
                >
                  {seedBusy ? 'Loading…' : 'Load demo jobs'}
                </button>
                <p className="mt-2 font-mono text-[10px] text-[#48484A]">
                  Requires .env.local service role + TRS tenant seed. Re-click to reset those four demo rows.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-4 pb-1 pt-1">
            {visibleJobs.map((job) => (
              <li key={job.id}>
                <JobCard job={job} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-trs-slate bg-trs-charcoal px-2 py-3 text-center">
      <p className="font-mono text-2xl font-semibold tabular-nums text-white">{value}</p>
      <p className="mt-1 text-xs text-[#8E8E93]">{label}</p>
    </div>
  )
}
