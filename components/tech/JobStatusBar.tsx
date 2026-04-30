'use client'

import type { JobStatus } from '@/types/enums'
import { JOB_STATUS_LABELS } from '@/types/enums'

const FLOW: JobStatus[] = ['pending', 'assigned', 'en_route', 'on_site', 'complete']

function stepIndex(status: JobStatus): number {
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
  const total = FLOW.length
  const label = JOB_STATUS_LABELS[status]

  return (
    <div aria-label={`Job status: ${label}, step ${current + 1} of ${total}`}>
      {/* Segmented progress bar — no overflow, works on any screen width */}
      <div className="flex gap-1 mb-2" role="presentation">
        {FLOW.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i <= current ? 'bg-trs-gold' : 'bg-trs-slate'
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-[#636366] font-mono tabular-nums">
          {current + 1} / {total}
        </p>
      </div>
    </div>
  )
}
