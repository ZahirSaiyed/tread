import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Role } from '@/types/enums'

// DEV ONLY — idempotent user + profile setup. Called by DevLoginPanel.
// Avoids listUsers() (slow). Uses try-create → public.users fallback instead.

const DEV_PASSWORD = 'trs-dev-local-2024'
const TRS_TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

const DEV_USERS: Record<Role, { email: string; name: string }> = {
  operator: { email: 'tony@trs.dev',   name: 'Tony (Dev)'   },
  tech:     { email: 'marcus@trs.dev', name: 'Marcus (Dev)' },
  admin:    { email: 'admin@trs.dev',  name: 'Admin (Dev)'  },
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { role } = await request.json() as { role: Role }
  const { email, name } = DEV_USERS[role] ?? DEV_USERS.operator
  const admin = createServiceClient()

  let userId: string

  // Fast path: try to create — succeeds on first call, fails on subsequent
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
  })

  if (!createError) {
    userId = created.user.id
  } else {
    // User already exists — find their ID from public.users (written on first setup)
    const { data: profile } = await admin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User exists in auth but has no profile row' }, { status: 500 })
    }
    userId = profile.id
  }

  // Upsert profile (no-op on repeat calls)
  await admin.from('users').upsert(
    { id: userId, tenant_id: TRS_TENANT_ID, role, name, email, is_active: true },
    { onConflict: 'id' },
  )

  return NextResponse.json({ email, password: DEV_PASSWORD })
}
