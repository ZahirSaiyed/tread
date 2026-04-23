import { z } from 'zod'
import type { JobStatus, ServiceType } from '@/types/enums'

const JOB_STATUSES: JobStatus[] = [
  'pending',
  'assigned',
  'en_route',
  'on_site',
  'complete',
  'cancelled',
]

const SERVICE_TYPES = [
  'mount_balance',
  'tire_repair',
  'wheel_repair',
  'jumpstart',
  'spare_installation',
  'tire_rotation',
  'tire_balancing',
  'tpms_service',
  'oil_change',
  'brake_service',
] as const satisfies readonly ServiceType[]

function parseCommaStatuses(raw: string | undefined): JobStatus[] | undefined {
  if (raw == null || raw.trim() === '') return undefined
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return undefined
  const out: JobStatus[] = []
  for (const p of parts) {
    if (!JOB_STATUSES.includes(p as JobStatus)) return undefined
    out.push(p as JobStatus)
  }
  return out
}

function parseCommaServiceTypes(raw: string | undefined): ServiceType[] | undefined {
  if (raw == null || raw.trim() === '') return undefined
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.length === 0) return undefined
  const allowed = new Set<string>(SERVICE_TYPES)
  const out: ServiceType[] = []
  for (const p of parts) {
    if (!allowed.has(p)) return undefined
    out.push(p as ServiceType)
  }
  return out
}

/** ISO-8601 instant or calendar date `YYYY-MM-DD` (interpreted as UTC start/end in route). */
const isoOrDate = z
  .string()
  .min(4)
  .refine(
    (s) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return true
      return !Number.isNaN(Date.parse(s))
    },
    { message: 'Invalid date' },
  )

export const ListJobsQuerySchema = z
  .object({
    status: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    assigned_tech_id: z.preprocess(
      (v) => (v === '' || v == null ? undefined : v),
      z.string().uuid().optional(),
    ),
    unassigned_only: z
      .enum(['true', 'false', '1', '0'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true' || v === '1')),
    service_type: z.string().optional(),
    created_from: isoOrDate.optional(),
    created_to: isoOrDate.optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.unassigned_only && val.assigned_tech_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cannot combine unassigned_only with assigned_tech_id',
        path: ['assigned_tech_id'],
      })
    }
    const from = val.created_from
    const to = val.created_to
    if (from && to) {
      const a = Date.parse(from.length === 10 ? `${from}T00:00:00.000Z` : from)
      const b = Date.parse(to.length === 10 ? `${to}T23:59:59.999Z` : to)
      if (!Number.isNaN(a) && !Number.isNaN(b) && a > b) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'created_from must be before or equal to created_to',
          path: ['created_to'],
        })
      }
    }
  })

export type ListJobsQueryInput = z.infer<typeof ListJobsQuerySchema>

export function parseListJobsQuery(searchParams: URLSearchParams): {
  ok: true
  data: {
    status?: JobStatus[]
    page: number
    pageSize: number
    assignedTechId?: string
    unassignedOnly?: boolean
    serviceTypes?: ServiceType[]
    createdFromIso?: string
    createdToIso?: string
  }
} | { ok: false; error: string } {
  const raw = Object.fromEntries(searchParams.entries())
  const parsed = ListJobsQuerySchema.safeParse(raw)
  if (!parsed.success) {
    const msg = parsed.error.errors[0]?.message ?? 'Invalid query'
    return { ok: false, error: msg }
  }
  const v = parsed.data
  const status = parseCommaStatuses(v.status)
  if (v.status && v.status.trim() !== '' && status === undefined) {
    return { ok: false, error: 'Invalid status value' }
  }
  const serviceTypes = parseCommaServiceTypes(v.service_type)
  if (v.service_type && v.service_type.trim() !== '' && serviceTypes === undefined) {
    return { ok: false, error: 'Invalid service_type value' }
  }

  const toIsoBoundary = (s: string | undefined, endOfDay: boolean): string | undefined => {
    if (!s) return undefined
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return endOfDay ? `${s}T23:59:59.999Z` : `${s}T00:00:00.000Z`
    }
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return undefined
    return d.toISOString()
  }

  return {
    ok: true,
    data: {
      status,
      page: v.page,
      pageSize: v.pageSize,
      assignedTechId: v.assigned_tech_id,
      unassignedOnly: v.unassigned_only === true ? true : undefined,
      serviceTypes,
      createdFromIso: toIsoBoundary(v.created_from, false),
      createdToIso: toIsoBoundary(v.created_to, true),
    },
  }
}
