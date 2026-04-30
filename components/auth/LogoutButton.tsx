'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8E8E93] hover:text-white transition-colors"
    >
      Sign out
    </button>
  )
}
