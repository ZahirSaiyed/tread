import type { TenantBranding } from './types'

/** Bundled default mark for TRS / first tenant (served from `public/`). */
export const DEFAULT_BRANDING_LOGO_PATH = '/branding/trs-default-logo.png'

export const DEFAULT_TENANT_NAME = "Tony's Roadside Services"

export const DEFAULT_TENANT_PRIMARY = '#F5A623'

/**
 * Normalize logo URL from env or DB. Relative paths without a leading `/` break on
 * nested routes (e.g. `/login` + `branding/x.png` → `/login/branding/x.png`).
 */
export function sanitizeLogoUrl(raw: string | null | undefined): string {
  const u = raw?.trim()
  if (!u) return DEFAULT_BRANDING_LOGO_PATH
  if (u.startsWith('https://') || u.startsWith('http://')) return u
  if (u.startsWith('/')) return u
  return `/${u.replace(/^\/+/, '')}`
}

/**
 * Fallback when no session or tenant row has no `logo_url`.
 * Override per deploy with `NEXT_PUBLIC_TENANT_*` for white-label login without DB writes.
 */
export function defaultPublicBranding(): TenantBranding {
  const logo = sanitizeLogoUrl(process.env.NEXT_PUBLIC_TENANT_LOGO_URL)
  const companyName =
    process.env.NEXT_PUBLIC_TENANT_DISPLAY_NAME?.trim() || DEFAULT_TENANT_NAME
  const primaryColor =
    process.env.NEXT_PUBLIC_TENANT_PRIMARY_COLOR?.trim() || DEFAULT_TENANT_PRIMARY
  return { companyName, logoUrl: logo, primaryColor }
}
