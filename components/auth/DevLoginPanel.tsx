'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { defaultRedirectForRole } from '@/lib/auth/roles'
import type { Role } from '@/types/enums'

const ROLES: { role: Role; label: string; sub: string }[] = [
  { role: 'operator', label: 'Tony',   sub: 'Operator' },
  { role: 'tech',     label: 'Marcus', sub: 'Tech'     },
]

export function DevLoginPanel() {
  const router = useRouter()
  const [loading, setLoading] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loginAs(role: Role) {
    setLoading(role)
    setError(null)

    // 1. Ensure user + profile exist (server-side, service role)
    const setup = await fetch('/api/dev/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })

    if (!setup.ok) {
      setError('Setup failed — check console')
      setLoading(null)
      return
    }

    const { email, password } = await setup.json()

    // 2. Sign in client-side — browser sets session cookies automatically
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(null)
      return
    }

    router.push(defaultRedirectForRole(role))
    router.refresh()
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px bg-[#2C2C2E]" />
        <span className="text-[#48484A] text-xs font-mono">DEV</span>
        <div className="flex-1 h-px bg-[#2C2C2E]" />
      </div>

      <div className="flex gap-2">
        {ROLES.map(({ role, label, sub }) => (
          <button
            key={role}
            onClick={() => loginAs(role)}
            disabled={loading !== null}
            className="flex-1 bg-[#1C1C1E] hover:bg-[#2C2C2E] disabled:opacity-50 rounded-xl py-3 px-4 text-left transition-colors border border-[#2C2C2E]"
          >
            <div className="text-white text-sm font-medium">
              {loading === role ? 'Signing in…' : label}
            </div>
            <div className="text-[#8E8E93] text-xs mt-0.5">{sub}</div>
          </button>
        ))}
      </div>

      {error && (
        <p className="text-[#FF3B30] text-xs mt-2 text-center">{error}</p>
      )}
    </div>
  )
}
