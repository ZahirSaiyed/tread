import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/session'
import type { TenantBranding } from './types'
import { defaultPublicBranding, sanitizeLogoUrl } from './constants'

/** Public auth pages (no session): env + bundled defaults. */
export function getPublicAuthBranding(): TenantBranding {
  return defaultPublicBranding()
}

/**
 * Signed-in shells: prefer `tenants.logo_url`, `name`, `primary_color`.
 * Falls back to `getPublicAuthBranding()` when columns are empty.
 */
export async function getCurrentTenantBranding(): Promise<TenantBranding> {
  const base = getPublicAuthBranding()
  const user = await getAuthUser()
  if (!user) return base

  const supabase = await createClient()
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, logo_url, primary_color')
    .eq('id', user.tenant_id)
    .single()

  if (!tenant) return base

  const rawLogo = tenant.logo_url?.trim()
  const logoUrl = rawLogo ? sanitizeLogoUrl(rawLogo) : base.logoUrl

  return {
    companyName: tenant.name?.trim() || base.companyName,
    logoUrl,
    primaryColor: tenant.primary_color?.trim() || base.primaryColor,
  }
}
