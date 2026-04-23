'use client'

import { useEffect, useState } from 'react'
import { DEFAULT_BRANDING_LOGO_PATH } from '@/lib/branding/constants'
import type { TenantBranding } from '@/lib/branding/types'

const SIZES = { sm: 40, md: 56, lg: 88 } as const

export type TenantLogoSize = keyof typeof SIZES

export interface TenantLogoProps {
  branding: Pick<TenantBranding, 'companyName' | 'logoUrl'>
  size?: TenantLogoSize
  className?: string
  /** When true, load immediately (above-the-fold auth). */
  priority?: boolean
}

/**
 * Tenant mark — plain `img`. If the primary `src` fails (404, bad env, wrong path on
 * `/login`), we fall back once to the bundled default in `public/branding/`.
 */
export function TenantLogo({
  branding,
  size = 'md',
  className,
  priority = false,
}: TenantLogoProps) {
  const px = SIZES[size]
  const [src, setSrc] = useState(branding.logoUrl)
  const [didFallback, setDidFallback] = useState(false)

  useEffect(() => {
    setSrc(branding.logoUrl)
    setDidFallback(false)
  }, [branding.logoUrl])

  const onError = () => {
    if (didFallback || src === DEFAULT_BRANDING_LOGO_PATH) return
    setDidFallback(true)
    setSrc(DEFAULT_BRANDING_LOGO_PATH)
  }

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-trs-charcoal to-trs-black ring-1 ring-white/[0.08] shadow-lg${className ? ` ${className}` : ''}`}
      style={{ width: px, height: px }}
    >
      <img
        src={src}
        alt={`${branding.companyName} logo`}
        width={px}
        height={px}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className="max-h-[85%] max-w-[85%] object-contain"
        onError={onError}
      />
    </div>
  )
}
