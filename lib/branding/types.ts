/** Serializable tenant-facing brand (auth pages, shell headers, marketing). */
export type TenantBranding = {
  companyName: string
  /** Absolute URL or app-relative path starting with `/` */
  logoUrl: string
  /** CSS hex for accents (buttons, focus rings) */
  primaryColor: string
}
