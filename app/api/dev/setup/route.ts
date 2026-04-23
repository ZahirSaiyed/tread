import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { Role } from '@/types/enums'

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

  // Try to create — fast path on first call
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: DEV_PASSWORD,
    email_confirm: true,
  })

  if (!createError) {
    userId = created.user.id
  } else {
    // User already exists in auth. Try public.users first (fast after first setup).
    const { data: profile } = await admin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()               // returns null on 0 rows, no error

    if (profile) {
      userId = profile.id
    } else {
      // Orphaned auth user (e.g. from failed previous attempt) — one-time listUsers fallback
      const { data: { users } } = await admin.auth.admin.listUsers()
      const existing = users.find(u => u.email === email)
      if (!existing) {
        return NextResponse.json({ error: `Auth user ${email} not found` }, { status: 500 })
      }
      userId = existing.id
      // Ensure password is set correctly
      await admin.auth.admin.updateUserById(userId, { password: DEV_PASSWORD })
    }
  }

  // Upsert profile — also seeds the tenant row if it's missing
  const { error: tenantCheck } = await admin
    .from('tenants')
    .select('id')
    .eq('id', TRS_TENANT_ID)
    .single()

  if (tenantCheck) {
    return NextResponse.json({
      error: 'TRS tenant row missing — run the seed SQL first',
      hint: `INSERT INTO tenants (id, name, slug, primary_color, plan_tier, after_hours_fee_cents, after_hours_start, after_hours_end, highway_minimum_fee_cents) VALUES ('${TRS_TENANT_ID}', 'TRS Mobile Tire Shop', 'trs', '#F5A623', 'starter', 7500, '22:00', '08:00', 17500) ON CONFLICT (id) DO NOTHING;`,
    }, { status: 500 })
  }

  const { error: upsertError } = await admin.from('users').upsert(
    { id: userId, tenant_id: TRS_TENANT_ID, role, name, email, is_active: true },
    { onConflict: 'id' },
  )

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message, code: upsertError.code }, { status: 500 })
  }

  return NextResponse.json({ email, password: DEV_PASSWORD })
}
