'use client'

import type { JobStatus } from '@/types/enums'
import { JOB_STATUS_LABELS } from '@/types/enums'

const FLOW: JobStatus[] = ['pending', 'assigned', 'en_route', 'on_site', 'complete']

function stepIndex(status: JobStatus): number {
  if (status === 'cancelled') return -1
  const i = FLOW.indexOf(status)
  return i === -1 ? 0 : i
}

export function JobStatusBar({ status }: { status: JobStatus }) {
  if (status === 'cancelled') {
    return (
      <div className="rounded-xl border border-[#48484A] bg-trs-slate/40 px-3 py-2 text-sm text-[#8E8E93]">
        Job cancelled
      </div>
    )
  }

  const current = stepIndex(status)

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Job status progress">
      {FLOW.map((s, i) => {
        const done = i < current
        const active = i === current
        const label = JOB_STATUS_LABELS[s]
        return (
          <div key={s} className="flex items-center gap-1 shrink-0">
            {i > 0 ? (
              <span className={`text-xs px-0.5 ${done || active ? 'text-trs-gold' : 'text-[#48484A]'}`}>
                ─
              </span>
            ) : null}
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
                done
                  ? 'bg-trs-gold/20 text-trs-gold'
                  : active
                    ? 'bg-status-onjob/25 text-status-onjob ring-1 ring-status-onjob'
                    : 'bg-trs-slate text-[#48484A]'
              }`}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
