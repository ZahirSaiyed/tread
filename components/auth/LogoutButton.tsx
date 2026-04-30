'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
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
      className="flex h-11 w-11 items-center justify-center rounded-xl text-[#636366] transition-colors hover:bg-trs-charcoal hover:text-white"
      aria-label="Sign out"
      title="Sign out"
    >
      <LogOut size={18} strokeWidth={1.75} aria-hidden />
    </button>
  )
}
