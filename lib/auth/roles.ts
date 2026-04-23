import type { Role } from '@/types/enums'
import type { AuthUser } from '@/types/domain'

export const OPERATOR_ROUTES = [
  '/dashboard',
  '/jobs',
  '/pricing',
  '/team',
  '/settings',
  '/analytics',
  '/messages',
  '/sops',
]

export const TECH_ROUTES = ['/jobs', '/training']

export const PUBLIC_ROUTES = [
  '/login',
  '/login-tech',
  '/track',
  '/api/auth',
  '/api/dev',
]

export function isPublicRoute(pathname: string): boolean {
  // Exact `/` only — do not use `startsWith('/')` or every path would be public.
  if (pathname === '/') return true
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

export function requiresRole(pathname: string): Role | null {
  // Tech routes under (tech) group — middleware uses different routing
  // based on role already in session, so this is a belt-and-suspenders check
  if (pathname.startsWith('/training')) return 'tech'
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/team') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/analytics') ||
    pathname.startsWith('/messages')
  ) {
    return 'operator'
  }
  if (pathname.startsWith('/admin')) return 'admin'
  return null
}

export function canAccess(user: AuthUser, pathname: string): boolean {
  if (user.role === 'admin') return true
  const required = requiresRole(pathname)
  if (!required) return true
  if (required === 'operator') return user.role === 'operator'
  if (required === 'tech') return user.role === 'tech'
  return false
}

// Returns the default redirect path for a given role after login
export function defaultRedirectForRole(role: Role): string {
  switch (role) {
    case 'operator':
      return '/dashboard'
    case 'tech':
      return '/jobs'
    case 'admin':
      return '/admin'
  }
}
