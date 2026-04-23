import { describe, expect, it } from 'vitest'
import { DEFAULT_BRANDING_LOGO_PATH, sanitizeLogoUrl } from './constants'

describe('sanitizeLogoUrl', () => {
  it('returns default when empty', () => {
    expect(sanitizeLogoUrl(undefined)).toBe(DEFAULT_BRANDING_LOGO_PATH)
    expect(sanitizeLogoUrl('')).toBe(DEFAULT_BRANDING_LOGO_PATH)
    expect(sanitizeLogoUrl('   ')).toBe(DEFAULT_BRANDING_LOGO_PATH)
  })

  it('preserves absolute paths', () => {
    expect(sanitizeLogoUrl('/branding/trs-default-logo.png')).toBe(
      '/branding/trs-default-logo.png',
    )
  })

  it('adds leading slash for bare relative paths', () => {
    expect(sanitizeLogoUrl('branding/logo.png')).toBe('/branding/logo.png')
  })

  it('preserves http(s) URLs', () => {
    expect(sanitizeLogoUrl('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png')
  })
})
