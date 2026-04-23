import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { defaultRedirectForRole } from '@/lib/auth/roles'
import type { Role } from '@/types/enums'

// DEV ONLY — 404s in production. No email, no magic link, no Supabase URL config.
//
// Usage:
//   /api/dev/login               → Tony (operator)
//   /api/dev/login?role=tech     → Marcus (tech)
//   /api/dev/login?role=admin    → Admin
//
// On first call: creates the auth user + profile row, then signs in.
// On repeat calls: signs in directly (idempotent).

const DEV_PASSWORD = 'trs-dev-local-2024'
const TRS_TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

const DEV_USERS: Record<Role, { email: string; name: string }> = {
  operator: { email: 'tony@trs.dev',   name: 'Tony (Dev)'   },
  tech:     { email: 'marcus@trs.dev', name: 'Marcus (Dev)' },
  admin:    { email: 'admin@trs.dev',  name: 'Admin (Dev)'  },
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const role = (searchParams.get('role') ?? 'operator') as Role
  const { email, name } = DEV_USERS[role] ?? DEV_USERS.operator

  const admin = createServiceClient()

  // ── 1. Find or create the auth user ──────────────────────────────────────
  const { data: { users } } = await admin.auth.admin.listUsers()
  const existing = users.find(u => u.email === email)

  let userId: string

  if (existing) {
    userId = existing.id
    // Keep password in sync in case it was never set
    await admin.auth.admin.updateUserById(userId, { password: DEV_PASSWORD })
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: DEV_PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message ?? 'Failed to create user' }, { status: 500 })
    }
    userId = data.user.id
  }

  // ── 2. Ensure profile row ─────────────────────────────────────────────────
  await admin.from('users').upsert(
    { id: userId, tenant_id: TRS_TENANT_ID, role, name, email, is_active: true },
    { onConflict: 'id' },
  )

  // ── 3. Sign in with password — sets session cookies via next/headers ──────
  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_PASSWORD,
  })

  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 500 })
  }

  return NextResponse.redirect(new URL(defaultRedirectForRole(role), request.url))
}
