'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useOperatorJobsRealtime } from '@/hooks/useOperatorJobsRealtime'
import { createClient } from '@/lib/supabase/client'
import {
  applyOperatorRealtimeJobsChange,
  computeJobStatusCounts,
  sortUnassignedQueueOldestFirst,
  techPresence,
  type TechPresenceKind,
} from '@/lib/operator/operatorJobsBoard'
import { googleDirectionsUrl } from '@/lib/tech/jobActions'
import { sortJobsForDashboard } from '@/lib/tech/jobsDashboard'
import type { Job } from '@/types/domain'
import type { PaginatedResponse } from '@/types/api'
import { JOB_STATUS_LABELS, SERVICE_TYPE_LABELS } from '@/types/enums'

type TechRow = { id: string; name: string; avatar_url: string | null }

const DND_TYPE = 'application/x-trs-job-id'

async function fetchBoardJobs(): Promise<Job[]> {
  const res = await fetch('/api/jobs?pageSize=100')
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(body.error ?? 'Failed to load jobs')
  }
  const json = (await res.json()) as PaginatedResponse<Job>
  return json.data ?? []
}

function presenceLabel(kind: TechPresenceKind): string {
  switch (kind) {
    case 'idle':
      return 'Idle'
    case 'dispatched':
      return 'Assigned'
    case 'en_route':
      return 'En Route'
    case 'on_site':
      return 'On Job'
    default:
      return '—'
  }
}

function presenceBorderClass(kind: TechPresenceKind): string {
  switch (kind) {
    case 'idle':
      return 'border-t-status-idle'
    case 'dispatched':
    case 'en_route':
      return 'border-t-status-enroute'
    case 'on_site':
      return 'border-t-status-onjob'
    default:
      return 'border-t-trs-slate'
  }
}

function presenceDotClass(kind: TechPresenceKind): string {
  switch (kind) {
    case 'idle':
      return 'bg-status-idle'
    case 'dispatched':
    case 'en_route':
      return 'bg-status-enroute'
    case 'on_site':
      return 'bg-status-onjob'
    default:
      return 'bg-[#8E8E93]'
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function OperatorStateBoard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [techs, setTechs] = useState<TechRow[]>([])
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignJobId, setAssignJobId] = useState<string | null>(null)
  const [assignBusy, setAssignBusy] = useState(false)
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchBoardJobs()
      setJobs(sortJobsForDashboard(data))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load jobs'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    const client = createClient()
    void (async () => {
      const { data: session } = await client.auth.getUser()
      const uid = session.user?.id
      if (!uid) return

      const { data: me } = await client
        .from('users')
        .select('tenant_id')
        .eq('id', uid)
        .maybeSingle()

      if (cancelled || !me?.tenant_id) return
      setTenantId(me.tenant_id)

      const { data: roster } = await client
        .from('users')
        .select('id,name,avatar_url')
        .eq('tenant_id', me.tenant_id)
        .eq('role', 'tech')
        .eq('is_active', true)
        .order('name')

      if (!cancelled && roster) {
        setTechs(roster as TechRow[])
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const onRealtime = useCallback(
    (newRow: Record<string, unknown>) => {
      if (!tenantId) return
      setJobs((prev) => sortJobsForDashboard(applyOperatorRealtimeJobsChange(prev, newRow, tenantId)))
    },
    [tenantId],
  )

  useOperatorJobsRealtime(tenantId, onRealtime)

  const unassigned = useMemo(() => sortUnassignedQueueOldestFirst(jobs), [jobs])
  const statusCounts = useMemo(() => computeJobStatusCounts(jobs), [jobs])

  const assignJob = useCallback(
    async (jobId: string, techId: string) => {
      setAssignBusy(true)
      const prev = jobs
      // Optimistic: update local job
      setJobs((j) =>
        sortJobsForDashboard(
          j.map((row) =>
            row.id === jobId
              ? {
                  ...row,
                  assigned_tech_id: techId,
                  status: 'assigned' as const,
                  assigned_at: new Date().toISOString(),
                }
              : row,
          ),
        ),
      )
      try {
        const res = await fetch(`/api/jobs/${jobId}/assign`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigned_tech_id: techId }),
        })
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Assignment failed')
        }
        const updated = (await res.json()) as Job
        setJobs((j) => sortJobsForDashboard(j.map((row) => (row.id === jobId ? { ...row, ...updated } : row))))
        toast.success('Job assigned')
        setAssignJobId(null)
      } catch (e) {
        setJobs(prev)
        toast.error(e instanceof Error ? e.message : 'Assignment failed')
      } finally {
        setAssignBusy(false)
      }
    },
    [jobs],
  )

  const onDropOnTech = useCallback(
    (e: React.DragEvent, techId: string) => {
      e.preventDefault()
      setDraggingJobId(null)
      const raw = e.dataTransfer.getData(DND_TYPE)
      if (!raw) return
      try {
        const { jobId } = JSON.parse(raw) as { jobId?: string }
        if (typeof jobId === 'string') void assignJob(jobId, techId)
      } catch {
        /* ignore */
      }
    },
    [assignJob],
  )

  if (loading) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(7rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))]">
        {/* Header chrome skeleton */}
        <div className="shrink-0 space-y-4 border-b border-white/[0.06] px-4 pb-4 pt-2">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-trs-slate" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-trs-charcoal" />
            ))}
          </div>
        </div>
        {/* Body skeleton */}
        <div className="min-h-0 flex-1 px-4 pt-4">
          <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-5 w-28 animate-pulse rounded bg-trs-slate" />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 animate-pulse rounded-2xl bg-trs-charcoal" />
                ))}
              </div>
            </div>
            <div className="w-full shrink-0 lg:w-80">
              <div className="h-64 animate-pulse rounded-2xl bg-trs-charcoal" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && jobs.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-[#8E8E93]">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-xl bg-trs-gold px-6 py-3 text-sm font-semibold text-black hover:bg-trs-gold-dark"
        >
          Retry
        </button>
      </div>
    )
  }

  const boardNote =
    'Live board uses the latest 100 jobs for this tenant. Open Jobs for the full list and filters.'

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(7rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))]">
      <div className="shrink-0 space-y-4 border-b border-white/[0.06] px-4 pb-4 pt-2">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">State Board</h1>
            <p className="mt-1 text-sm text-[#8E8E93]">Mission control — live technician state</p>
          </div>
          <Link
            href="/dashboard/jobs"
            className="min-h-touch inline-flex items-center justify-center rounded-xl border border-trs-slate px-4 text-sm font-medium text-trs-gold hover:border-trs-gold"
          >
            All jobs
          </Link>
        </header>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6" aria-label="Jobs by status">
          {(Object.keys(statusCounts) as (keyof typeof statusCounts)[]).map((status) => (
            <div
              key={status}
              className="rounded-xl border border-trs-slate bg-trs-charcoal px-2 py-2 text-center"
            >
              <p className="font-mono text-lg font-semibold tabular-nums text-white">{statusCounts[status]}</p>
              <p className="text-[11px] text-[#8E8E93]">{JOB_STATUS_LABELS[status]}</p>
            </div>
          ))}
        </section>

        <p className="text-xs text-[#48484A]">{boardNote}</p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-6 pt-4 [-webkit-overflow-scrolling:touch]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-start">
          {/* Tech tiles */}
          <div className="min-w-0 flex-1 space-y-4">
            <h2 className="text-lg font-semibold text-white">Technicians</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {techs.map((tech) => {
                const { kind, job } = techPresence(tech.id, jobs)
                const border = presenceBorderClass(kind)
                return (
                  <article
                    key={tech.id}
                    onDragOver={(e) => {
                      if (draggingJobId) e.preventDefault()
                    }}
                    onDrop={(e) => onDropOnTech(e, tech.id)}
                    className={`rounded-2xl border border-trs-slate bg-trs-charcoal ${border} border-t-4 p-4 shadow-lg transition-shadow hover:border-trs-slate/80`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-trs-slate">
                        {tech.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element -- tenant storage URLs vary by host
                          <img src={tech.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">
                            {initials(tech.name)}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{tech.name}</p>
                        <p className="mt-1 flex items-center gap-2 text-sm">
                          <span className={`inline-block h-2 w-2 rounded-full ${presenceDotClass(kind)}`} />
                          <span className="text-[#8E8E93]">{presenceLabel(kind)}</span>
                        </p>
                      </div>
                    </div>
                    {job ? (
                      <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                        <p className="text-sm font-medium text-white">
                          {SERVICE_TYPE_LABELS[job.service_type] ?? job.service_type}
                        </p>
                        <p className="line-clamp-2 text-sm text-[#8E8E93]">{job.address}</p>
                        <a
                          href={googleDirectionsUrl(job.address)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-touch items-center text-sm font-medium text-trs-gold hover:underline"
                        >
                          Directions
                        </a>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-[#48484A]">No active dispatch</p>
                    )}
                  </article>
                )
              })}
            </div>
            {techs.length === 0 ? (
              <p className="text-sm text-[#8E8E93]">No active technicians in this tenant.</p>
            ) : null}
          </div>

          {/* Unassigned queue */}
          <aside className="w-full shrink-0 lg:w-80 xl:w-96">
            <div
              className={`rounded-2xl border bg-trs-charcoal p-4 ${
                unassigned.length > 0 ? 'border-status-enroute/60 shadow-[0_0_20px_rgba(255,159,10,0.12)]' : 'border-trs-slate'
              }`}
            >
              <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                Unassigned
                {unassigned.length > 0 ? (
                  <span className="inline-flex min-w-[1.5rem] justify-center rounded-full bg-status-enroute px-2 py-0.5 text-xs font-bold text-black">
                    {unassigned.length}
                  </span>
                ) : null}
              </h2>
              <p className="mt-1 text-xs text-[#8E8E93]">Oldest first. Tap to assign or drag to a tech card (desktop).</p>
              <ul className="mt-4 space-y-2">
                {unassigned.map((job) => (
                  <li key={job.id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        setDraggingJobId(job.id)
                        e.dataTransfer.setData(DND_TYPE, JSON.stringify({ jobId: job.id }))
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragEnd={() => setDraggingJobId(null)}
                      onClick={() => setAssignJobId(job.id)}
                      className="w-full rounded-xl border border-trs-slate bg-trs-black/40 px-3 py-3 text-left transition-colors hover:border-trs-gold active:bg-trs-slate/40"
                    >
                      <p className="font-medium text-white">{job.customer_name}</p>
                      <p className="mt-1 text-xs text-trs-gold">
                        {SERVICE_TYPE_LABELS[job.service_type] ?? job.service_type}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-[#8E8E93]">{job.address}</p>
                    </button>
                  </li>
                ))}
              </ul>
              {unassigned.length === 0 ? (
                <p className="mt-6 text-center text-sm text-[#8E8E93]">Queue clear</p>
              ) : null}
            </div>
          </aside>
        </div>
      </div>

      {/* Assign sheet */}
      {assignJobId ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="dialog"
          aria-modal
          aria-labelledby="assign-heading"
          onClick={() => setAssignJobId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-trs-slate bg-trs-charcoal p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="assign-heading" className="text-lg font-semibold text-white">
              Assign job
            </h3>
            <p className="mt-1 text-sm text-[#8E8E93]">Choose a technician</p>
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {techs.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={assignBusy}
                    onClick={() => void assignJob(assignJobId, t.id)}
                    className="flex min-h-touch w-full items-center gap-3 rounded-xl border border-trs-slate px-3 py-2 text-left hover:border-trs-gold disabled:opacity-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-trs-slate text-sm font-semibold text-white">
                      {t.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(t.name)
                      )}
                    </span>
                    <span className="font-medium text-white">{t.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-6 w-full rounded-xl border border-trs-slate py-3 text-sm font-medium text-[#8E8E93] hover:text-white"
              onClick={() => setAssignJobId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
