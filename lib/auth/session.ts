import { createClient } from '@/lib/supabase/server'
import type { AuthUser } from '@/types/domain'
import type { Role } from '@/types/enums'

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role, name')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    tenant_id: profile.tenant_id,
    role: profile.role as Role,
    name: profile.name,
  }
}
