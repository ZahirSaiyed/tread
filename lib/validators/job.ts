import { z } from 'zod'
import type { JobStatus } from '@/types/enums'

const phoneE164 = z
  .string()
  .regex(/^\+1[2-9]\d{9}$/, 'Enter a valid US phone number (+1XXXXXXXXXX)')

export const CreateJobSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(100),
  customer_phone: phoneE164,
  address: z.string().min(5, 'Address is required').max(300),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  vehicle_year: z
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1)
    .nullable()
    .optional(),
  vehicle_make: z.string().max(50).nullable().optional(),
  vehicle_model: z.string().max(50).nullable().optional(),
  service_type: z.enum([
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
  ]),
  service_variant: z.string().max(50).nullable().optional(),
  price_cents: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  source: z.enum(['sms', 'web', 'manual']).default('manual'),
  assigned_tech_id: z.string().uuid().nullable().optional(),
})

export type CreateJobInput = z.infer<typeof CreateJobSchema>

// Allowed status transitions (from → allowed tos)
const STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  pending:   ['assigned', 'cancelled'],
  assigned:  ['en_route', 'cancelled'],
  en_route:  ['on_site', 'cancelled'],
  on_site:   ['complete', 'cancelled'],
  complete:  [],
  cancelled: [],
}

export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

// Request body for PATCH /api/jobs/[id]/status
// current_status is NOT accepted from client — the route reads it from the DB.
export const UpdateJobStatusSchema = z
  .object({
    status: z.enum(['pending', 'assigned', 'en_route', 'on_site', 'complete', 'cancelled']),
    cancellation_reason: z.string().min(1).max(500).optional(),
  })
  .refine(
    ({ status, cancellation_reason }) =>
      status !== 'cancelled' || !!cancellation_reason,
    { message: 'Cancellation reason is required', path: ['cancellation_reason'] },
  )

export type UpdateJobStatusInput = z.infer<typeof UpdateJobStatusSchema>

export const AssignTechSchema = z.object({
  assigned_tech_id: z.string().uuid('Invalid tech ID'),
})

export type AssignTechInput = z.infer<typeof AssignTechSchema>
