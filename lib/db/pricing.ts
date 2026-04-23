import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import type { PricingRule } from '@/types/domain'
import type { ServiceType, VehicleClass, LocationType } from '@/types/enums'

type Client = SupabaseClient<Database>

export interface PricingLookupParams {
  tenantId: string
  serviceType: ServiceType
  vehicleClass: VehicleClass
  locationType: LocationType
}

// Returns the most specific active pricing rule for the given combination.
// Falls back: exact match → standard vehicle_class → suburban location_type → standard+suburban.
export async function findPricingRule(
  client: Client,
  params: PricingLookupParams,
): Promise<PricingRule | null> {
  const { tenantId, serviceType, vehicleClass, locationType } = params

  const { data, error } = await client
    .from('pricing_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('service_type', serviceType)
    .eq('is_active', true)
    .in('vehicle_class', [vehicleClass, 'standard'])
    .in('location_type', [locationType, 'suburban'])

  if (error) throw error
  if (!data || data.length === 0) return null

  // Rank by specificity: exact vehicle_class match > standard fallback,
  // exact location_type match > suburban fallback
  const ranked = data.sort((a, b) => {
    const aVehicleScore = a.vehicle_class === vehicleClass ? 2 : 0
    const aLocationScore = a.location_type === locationType ? 1 : 0
    const bVehicleScore = b.vehicle_class === vehicleClass ? 2 : 0
    const bLocationScore = b.location_type === locationType ? 1 : 0
    return bVehicleScore + bLocationScore - (aVehicleScore + aLocationScore)
  })

  return ranked[0] as unknown as PricingRule
}

export async function listPricingRules(
  client: Client,
  tenantId: string,
): Promise<PricingRule[]> {
  const { data, error } = await client
    .from('pricing_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('service_type')
    .order('vehicle_class')
    .order('location_type')

  if (error) throw error
  return (data ?? []) as unknown as PricingRule[]
}

export async function upsertPricingRule(
  client: Client,
  rule: Omit<PricingRule, 'id' | 'created_at'> & { id?: string },
): Promise<PricingRule> {
  const { data, error } = await client
    .from('pricing_rules')
    .upsert(rule, { onConflict: 'tenant_id,service_type,vehicle_class,location_type' })
    .select()
    .single()

  if (error) throw error
  return data as unknown as PricingRule
}
