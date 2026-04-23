import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/session'
import { listPricingRules } from '@/lib/db/pricing'
import { formatCents } from '@/lib/pricing/quote'
import {
  SERVICE_TYPE_LABELS,
  VEHICLE_CLASS_LABELS,
  LOCATION_TYPE_LABELS,
} from '@/types/enums'
import type { ServiceType, VehicleClass, LocationType } from '@/types/enums'
import type { PricingRule } from '@/types/domain'
import { PricingRuleRow } from './PricingRuleRow'

export default async function PricingPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (user.role === 'tech') redirect('/jobs')

  const supabase = await createClient()
  const rules = await listPricingRules(supabase, user.tenant_id)

  // Group by service_type
  const grouped = rules.reduce<Record<string, PricingRule[]>>((acc, rule) => {
    const group = acc[rule.service_type] ?? []
    group.push(rule)
    acc[rule.service_type] = group
    return acc
  }, {})

  const serviceTypes = Object.keys(grouped) as ServiceType[]

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold font-['Syne',sans-serif]">Pricing</h1>
        <p className="text-[#8E8E93] text-sm mt-1">
          Base service rates for TRS. Mobile fee is a flat dispatch charge per job.
          Tax defaults to Virginia 6%.
        </p>
      </div>

      {serviceTypes.length === 0 ? (
        <div className="bg-[#1C1C1E] rounded-2xl p-8 text-center">
          <p className="text-[#8E8E93]">No pricing rules configured yet.</p>
          <p className="text-[#48484A] text-sm mt-1">Run the database seed to load Tony&apos;s defaults.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {serviceTypes.map((serviceType) => (
            <section key={serviceType}>
              <h2 className="text-[#F5A623] text-sm font-semibold uppercase tracking-widest mb-3">
                {SERVICE_TYPE_LABELS[serviceType]}
              </h2>
              <div className="bg-[#1C1C1E] rounded-2xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_48px] gap-0 px-4 py-2 border-b border-[#2C2C2E]">
                  {['Vehicle Class', 'Location', 'Base (per unit)', 'Mobile Fee', 'Disposal', 'Tax', ''].map((h) => (
                    <span key={h} className="text-[#48484A] text-xs font-medium">{h}</span>
                  ))}
                </div>
                {/* Rows */}
                {(grouped[serviceType] ?? []).map((rule) => (
                  <PricingRuleRow key={rule.id} rule={rule} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="text-[#48484A] text-xs mt-8">
        Prices shown exclude tax. Tax is applied to the full pre-tax subtotal at checkout.
        Wheel lock removal ($25/lock) is added when applicable.
      </p>
    </main>
  )
}
