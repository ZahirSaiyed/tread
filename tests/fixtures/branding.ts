import type { TenantBranding } from '@/lib/branding/types'

/** Canonical tenant branding for component tests (auth forms, headers). */
export const TEST_TENANT_BRANDING: TenantBranding = {
  companyName: 'Test Mobile Tire',
  logoUrl: '/branding/trs-default-logo.png',
  primaryColor: '#F5A623',
}
