import { describe, it, expect } from 'vitest'
import {
  isPublicRoute,
  requiresRole,
  canAccess,
  defaultRedirectForRole,
} from './roles'
import type { AuthUser } from '@/types/domain'

const trsOperator: AuthUser = {
  id: 'user-1',
  email: 'tony@trs.com',
  phone: null,
  tenant_id: 'tenant-trs',
  role: 'operator',
  name: 'Tony',
}

const trsTech: AuthUser = {
  id: 'user-2',
  email: null,
  phone: '+17035551234',
  tenant_id: 'tenant-trs',
  role: 'tech',
  name: 'Marcus',
}

const admin: AuthUser = {
  id: 'user-admin',
  email: 'admin@platform.com',
  phone: null,
  tenant_id: 'tenant-internal',
  role: 'admin',
  name: 'Admin',
}

describe('isPublicRoute', () => {
  it('marks / as public (home; anon users redirected to /login from the page)', () => {
    expect(isPublicRoute('/')).toBe(true)
  })

  it('marks /login as public', () => {
    expect(isPublicRoute('/login')).toBe(true)
  })

  it('marks /login-tech as public', () => {
    expect(isPublicRoute('/login-tech')).toBe(true)
  })

  it('marks /track/abc123 as public', () => {
    expect(isPublicRoute('/track/abc123')).toBe(true)
  })

  it('marks /api/auth/callback as public', () => {
    expect(isPublicRoute('/api/auth/callback')).toBe(true)
  })

  it('marks /dashboard as protected', () => {
    expect(isPublicRoute('/dashboard')).toBe(false)
  })

  it('marks /jobs as protected', () => {
    expect(isPublicRoute('/jobs')).toBe(false)
  })

  it('marks /api/jobs as protected', () => {
    expect(isPublicRoute('/api/jobs')).toBe(false)
  })
})

describe('requiresRole', () => {
  it('returns operator for /dashboard', () => {
    expect(requiresRole('/dashboard')).toBe('operator')
  })

  it('returns operator for /pricing', () => {
    expect(requiresRole('/pricing')).toBe('operator')
  })

  it('returns tech for /training', () => {
    expect(requiresRole('/training')).toBe('tech')
  })

  it('returns admin for /admin/anything', () => {
    expect(requiresRole('/admin/tenants')).toBe('admin')
  })

  it('returns null for /jobs (shared — middleware handles role split)', () => {
    expect(requiresRole('/jobs')).toBeNull()
  })
})

describe('canAccess', () => {
  it('operator can access /dashboard', () => {
    expect(canAccess(trsOperator, '/dashboard')).toBe(true)
  })

  it('tech cannot access /dashboard', () => {
    expect(canAccess(trsTech, '/dashboard')).toBe(false)
  })

  it('tech can access /training', () => {
    expect(canAccess(trsTech, '/training')).toBe(true)
  })

  it('operator cannot access /training (tech-only)', () => {
    expect(canAccess(trsOperator, '/training')).toBe(false)
  })

  it('admin can access all routes', () => {
    expect(canAccess(admin, '/dashboard')).toBe(true)
    expect(canAccess(admin, '/training')).toBe(true)
    expect(canAccess(admin, '/admin/tenants')).toBe(true)
  })

  it('tech cannot access /admin routes', () => {
    expect(canAccess(trsTech, '/admin/tenants')).toBe(false)
  })
})

describe('defaultRedirectForRole', () => {
  it('redirects operator to /dashboard', () => {
    expect(defaultRedirectForRole('operator')).toBe('/dashboard')
  })

  it('redirects tech to /jobs', () => {
    expect(defaultRedirectForRole('tech')).toBe('/jobs')
  })

  it('redirects admin to /admin', () => {
    expect(defaultRedirectForRole('admin')).toBe('/admin')
  })
})
