'use client'

import Link from 'next/link'
import { useLayoutEffect, useState } from 'react'
import { MapPin, Car, Clock } from 'lucide-react'
import type { Job } from '@/types/domain'
import type { JobStatus } from '@/types/enums'
import { JOB_STATUS_LABELS, SERVICE_TYPE_LABELS } from '@/types/enums'
import {
  directionsUrlForDevice,
  googleDirectionsUrl,
  telUrl,
} from '@/lib/tech/jobActions'

// Each status gets its own color — no more collapsing 3 states into one blue.
function statusAccent(status: JobStatus): { dot: string; border: string; labelClass: string } {
  switch (status) {
    case 'pending':
      return { dot: 'bg-[#636366]', border: 'border-l-[#636366]', labelClass: 'text-[#8E8E93]' }
    case 'assigned':
      return { dot: 'bg-trs-gold', border: 'border-l-trs-gold', labelClass: 'text-trs-gold' }
    case 'en_route':
      return { dot: 'bg-status-enroute', border: 'border-l-status-enroute', labelClass: 'text-status-enroute' }
    case 'on_site':
      return { dot: 'bg-status-onjob', border: 'border-l-status-onjob', labelClass: 'text-status-onjob' }
    case 'complete':
      return { dot: 'bg-status-complete', border: 'border-l-status-complete', labelClass: 'text-status-complete' }
    case 'cancelled':
      return { dot: 'bg-[#48484A]', border: 'border-l-[#48484A]', labelClass: 'text-[#8E8E93]' }
    default:
      return { dot: 'bg-[#8E8E93]', border: 'border-l-[#8E8E93]', labelClass: 'text-[#8E8E93]' }
  }
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function vehicleLine(job: Job): string | null {
  const parts = [job.vehicle_year, job.vehicle_make, job.vehicle_model].filter(Boolean)
  if (parts.length === 0) return null
  return parts.join(' ')
}

export interface JobCardProps {
  job: Job
}

export function JobCard({ job }: JobCardProps) {
  const { dot, border, labelClass } = statusAccent(job.status)
  const serviceLabel = SERVICE_TYPE_LABELS[job.service_type] ?? job.service_type
  const statusLabel = JOB_STATUS_LABELS[job.status]
  const vehicle = vehicleLine(job)

  const [mapsHref, setMapsHref] = useState(() => googleDirectionsUrl(job.address))
  useLayoutEffect(() => {
    setMapsHref(directionsUrlForDevice(job.address))
  }, [job.address])

  return (
    <article
      className={`rounded-2xl border border-trs-slate bg-trs-charcoal border-l-4 ${border} pl-4 pr-3 py-4 shadow-sm`}
    >
      <Link href={`/jobs/${job.id}`} className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-trs-gold">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
            <span className={`text-xs font-semibold tracking-wide ${labelClass}`}>
              {statusLabel.toUpperCase()}
            </span>
          </div>
          <time className="text-xs text-[#8E8E93] shrink-0 font-mono tabular-nums" dateTime={job.created_at}>
            {formatShortDate(job.created_at)}
          </time>
        </div>

        <h2 className="font-display text-lg text-white font-semibold leading-tight">{job.customer_name}</h2>
        <p className="text-sm text-trs-gold mt-1">{serviceLabel}</p>

        <p className="text-sm text-[#8E8E93] mt-3 flex items-start gap-2">
          <MapPin size={14} className="mt-0.5 shrink-0 text-[#636366]" aria-hidden />
          <span className="break-words">{job.address}</span>
        </p>
        {vehicle ? (
          <p className="text-sm text-[#8E8E93] mt-2 flex items-center gap-2">
            <Car size={14} className="shrink-0 text-[#636366]" aria-hidden />
            <span>{vehicle}</span>
          </p>
        ) : null}
        <p className="text-sm text-[#8E8E93] mt-2 flex items-center gap-2">
          <Clock size={14} className="shrink-0 text-[#636366]" aria-hidden />
          <span className="font-mono tabular-nums">{formatTime(job.created_at)}</span>
        </p>
        <p className="text-xs text-trs-gold/80 mt-2 font-medium">View job details →</p>
      </Link>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl bg-trs-slate px-4 text-sm font-medium text-white hover:bg-trs-gold/20 hover:text-trs-gold transition-colors"
        >
          Get Directions
        </a>
        <a
          href={telUrl(job.customer_phone)}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl bg-trs-gold px-4 text-sm font-semibold text-black hover:bg-trs-gold-dark transition-colors"
        >
          Call Customer
        </a>
      </div>
    </article>
  )
}
