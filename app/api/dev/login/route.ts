import { NextResponse, type NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { defaultRedirectForRole } from '@/lib/auth/roles'
import type { Role } from '@/types/enums'

// DEV ONLY — 404s in production.
// Usage:
//   /api/dev/login                        → operator (tony@trs.dev)
//   /api/dev/login?role=tech              → tech     (marcus@trs.dev)
//   /api/dev/login?email=x@y.com&role=operator
//
// Creates the auth user and profile row on first call, reuses on subsequent calls.

const TRS_TENANT_ID = 'a1b2c3d4-0000-0000-0000-000000000001'

const DEFAULTS: Record<Role, { email: string; name: string }> = {
  operator: { email: 'tony@trs.dev',   name: 'Tony (Dev)'   },
  tech:     { email: 'marcus@trs.dev', name: 'Marcus (Dev)' },
  admin:    { email: 'admin@trs.dev',  name: 'Admin (Dev)'  },
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { searchParams, origin } = new URL(request.url)
  const role = (searchParams.get('role') ?? 'operator') as Role
  const defaults = DEFAULTS[role] ?? DEFAULTS.operator
  const email = searchParams.get('email') ?? defaults.email
  const name = searchParams.get('name') ?? defaults.name

  const supabase = createServiceClient()
  const callbackUrl = `${origin}/api/auth/callback`

  // generateLink creates the auth user if they don't exist,
  // or issues a new link if they do. Either way we get user.id.
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: callbackUrl },
  })

  if (error || !data.user || !data.properties?.action_link) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to generate dev login link' },
      { status: 500 },
    )
  }

  // Ensure a profile row exists — upsert is idempotent
  await supabase.from('users').upsert(
    {
      id: data.user.id,
      tenant_id: TRS_TENANT_ID,
      role,
      name,
      email,
      is_active: true,
    },
    { onConflict: 'id' },
  )

  // Redirect through Supabase's verify URL → callback → app
  return NextResponse.redirect(data.properties.action_link)
}
