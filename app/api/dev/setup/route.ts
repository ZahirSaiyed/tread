import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Role } from '@/types/enums'

// DEV ONLY — creates auth user + profile row. Called by the dev login panel
// before client-side signInWithPassword. Safe to call repeatedly (idempotent).

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
  const { data: { users } } = await admin.auth.admin.listUsers()
  const existing = users.find(u => u.email === email)

  let userId: string

  if (existing) {
    userId = existing.id
    await admin.auth.admin.updateUserById(userId, { password: DEV_PASSWORD })
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: DEV_PASSWORD,
      email_confirm: true,
    })
    if (error || !data.user) {
      return NextResponse.json({ error: error?.message }, { status: 500 })
    }
    userId = data.user.id
  }

  await admin.from('users').upsert(
    { id: userId, tenant_id: TRS_TENANT_ID, role, name, email, is_active: true },
    { onConflict: 'id' },
  )

  return NextResponse.json({ email, password: DEV_PASSWORD })
}
