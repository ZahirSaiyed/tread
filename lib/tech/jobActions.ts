/**
 * Client-only helpers for tech job actions (maps, phone).
 */

export function telUrl(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '')
  if (!cleaned) return '#'
  return cleaned.startsWith('+') ? `tel:${cleaned}` : `tel:+${cleaned}`
}

function isAppleMobileUa(ua: string): boolean {
  const u = ua.toLowerCase()
  return /iphone|ipad|ipod/.test(u)
}

/** Google Maps directions (Android / desktop default). */
export function googleDirectionsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

/** Apple Maps directions (iOS Safari / native WebView). */
export function appleDirectionsUrl(address: string): string {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`
}

/**
 * Prefer Apple Maps on iPhone/iPad; Google Maps elsewhere (incl. Android).
 * Call from client components only (uses `navigator`).
 */
export function directionsUrlForDevice(address: string): string {
  if (typeof navigator === 'undefined') return googleDirectionsUrl(address)
  const ua = navigator.userAgent ?? ''
  const chMobile = (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData
    ?.mobile
  if (isAppleMobileUa(ua) || (chMobile && /macintosh/i.test(ua))) {
    return appleDirectionsUrl(address)
  }
  return googleDirectionsUrl(address)
}
