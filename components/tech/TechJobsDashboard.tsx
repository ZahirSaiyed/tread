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
  const [pullOffset, setPullOffset] = useState(0)

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
    if (dy > 0) setPullOffset(Math.min(dy, 120))
  }

  const endPull = () => {
    pullStartY.current = null
    if (pullOffset >= 72) {
      void load({ silent: true })
    }
    setPullOffset(0)
  }

  if (loading) {
    return (
      <div className="space-y-4 px-4 pt-4 pb-28" aria-busy="true" aria-label="Loading jobs">
        <div className="h-8 w-40 rounded-lg bg-trs-slate animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-trs-slate animate-pulse" />
          ))}
        </div>
        <div className="h-10 rounded-xl bg-trs-slate animate-pulse" />
        <div className="h-12 rounded-xl bg-trs-slate animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 rounded-2xl bg-trs-charcoal border border-trs-slate animate-pulse" />
        ))}
      </div>
    )
  }

  if (error && jobs.length === 0) {
    return (
      <div className="px-4 pt-8 pb-28 text-center">
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
    <div className="flex flex-col min-h-0 flex-1">
      <div
        className="text-center text-xs text-trs-gold font-medium transition-opacity"
        style={{ height: pullOffset > 8 ? 24 : 0, opacity: pullOffset > 8 ? 1 : 0 }}
        aria-live="polite"
      >
        {pullOffset >= 72 ? 'Release to refresh' : 'Pull to refresh'}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-y-contain px-4 pb-28"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={endPull}
        onTouchCancel={endPull}
        style={{ transform: pullOffset > 0 ? `translateY(${pullOffset * 0.35}px)` : undefined }}
      >
        <header className="pt-2 pb-4">
          <h1 className="font-display text-2xl font-bold text-white">My Jobs</h1>
          <p className="text-sm text-[#8E8E93] mt-1">Live updates from dispatch</p>
        </header>

        <section className="grid grid-cols-3 gap-2 mb-4" aria-label="Job counts">
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
          placeholder="Search name or address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-trs-slate bg-trs-charcoal px-4 py-3 text-base text-white placeholder:text-[#48484A] focus:border-trs-gold focus:outline-none mb-4"
          autoComplete="off"
        />

        <div
          className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1"
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
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? 'bg-trs-gold text-black'
                  : 'bg-trs-slate text-[#8E8E93] hover:text-white'
              }`}
            >
              {TECH_JOBS_TAB_LABELS[key]}
            </button>
          ))}
        </div>

        {refreshing ? (
          <p className="text-center text-xs text-[#8E8E93] py-2">Refreshing…</p>
        ) : null}

        {visibleJobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-trs-slate bg-trs-charcoal/50 px-4 py-12 text-center">
            <p className="text-white font-medium">
              {jobs.length === 0
                ? 'No active jobs today'
                : 'No jobs match this filter'}
            </p>
            <p className="text-sm text-[#8E8E93] mt-2">
              {jobs.length === 0
                ? 'Waiting for assignments from dispatch.'
                : 'Try another filter or clear your search.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
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
    <div className="rounded-xl bg-trs-charcoal border border-trs-slate px-2 py-3 text-center">
      <p className="font-mono text-2xl font-semibold text-white tabular-nums">{value}</p>
      <p className="text-xs text-[#8E8E93] mt-1">{label}</p>
    </div>
  )
}
