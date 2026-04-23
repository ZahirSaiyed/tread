'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/session'
import { upsertPricingRule } from '@/lib/db/pricing'
import type { ServiceType } from '@/types/enums'

const SERVICE_TYPES = [
  'mount_balance','tire_repair','wheel_repair','jumpstart','spare_installation',
  'tire_rotation','tire_balancing','tpms_service','oil_change','brake_service',
] as const

const UpdateRuleSchema = z.object({
  id: z.string().uuid().optional(),
  service_type: z.enum(SERVICE_TYPES),
  vehicle_class: z.enum(['standard', 'suv', 'truck', 'lt', 'specialty']),
  location_type: z.enum(['suburban', 'highway']),
  base_price_cents: z.coerce.number().int().min(0),
  mobile_fee_cents: z.coerce.number().int().min(0),
  disposal_fee_cents: z.coerce.number().int().min(0),
  tax_rate: z.coerce.number().min(0).max(1),
  is_active: z.coerce.boolean().default(true),
})

export async function updatePricingRule(formData: FormData) {
  const user = await getAuthUser()
  if (!user || user.role === 'tech') throw new Error('Forbidden')

  const parsed = UpdateRuleSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? 'Validation error')

  const supabase = await createClient()
  await upsertPricingRule(supabase, { ...parsed.data, tenant_id: user.tenant_id })

  revalidatePath('/pricing')
}
