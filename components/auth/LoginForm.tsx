'use client'

import { useState } from 'react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { TenantLogo } from '@/components/branding/TenantLogo'
import type { TenantBranding } from '@/lib/branding/types'

const emailSchema = z.string().email('Enter a valid email address')

interface LoginFormProps {
  redirectTo?: string
  serverError?: string
  branding: TenantBranding
}

type State = 'idle' | 'loading' | 'sent' | 'error'

export function LoginForm({ redirectTo, serverError, branding }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>(serverError ? 'error' : 'idle')
  const [errorMessage, setErrorMessage] = useState(
    serverError === 'auth_failed'
      ? 'Sign-in link expired. Try again.'
      : serverError === 'missing_code'
        ? 'Invalid sign-in link.'
        : '',
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const result = emailSchema.safeParse(email)
    if (!result.success) {
      setErrorMessage(result.error.errors[0]?.message ?? 'Invalid email')
      setState('error')
      return
    }

    setState('loading')
    setErrorMessage('')

    const supabase = createClient()
    const callbackUrl = new URL(
      '/api/auth/callback',
      process.env.NEXT_PUBLIC_APP_URL,
    )
    if (redirectTo) callbackUrl.searchParams.set('redirect', redirectTo)

    const { error } = await supabase.auth.signInWithOtp({
      email: result.data,
      options: {
        emailRedirectTo: callbackUrl.toString(),
      },
    })

    if (error) {
      setErrorMessage('Could not send sign-in link. Try again.')
      setState('error')
      return
    }

    setState('sent')
  }

  return (
    <div>
      <div className="mb-8 flex w-full flex-col items-center gap-4 text-center">
        <TenantLogo branding={branding} size="lg" priority />
        <div className="w-full min-w-0 px-1">
          <h1 className="font-display text-balance text-lg font-semibold tracking-tight text-white sm:text-xl">
            {branding.companyName}
          </h1>
          <span
            className="mx-auto mt-2 block h-0.5 w-12 rounded-full"
            style={{ backgroundColor: branding.primaryColor }}
            aria-hidden
          />
          <p className="mt-3 text-sm text-[#8E8E93]">Operator sign in</p>
        </div>
      </div>

      {state === 'sent' ? (
        <div
          role="status"
          aria-live="polite"
          className="bg-[#1C1C1E] rounded-2xl p-6 text-center"
        >
          <div className="text-[#34C759] text-4xl mb-3" aria-hidden="true">
            ✓
          </div>
          <p className="text-white font-medium">Check your email</p>
          <p className="text-[#8E8E93] text-sm mt-2">
            We sent a sign-in link to <strong className="text-white">{email}</strong>.
            Click the link to continue.
          </p>
          <button
            onClick={() => setState('idle')}
            className="mt-4 text-sm underline-offset-2 hover:underline"
            style={{ color: branding.primaryColor }}
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="bg-[#1C1C1E] rounded-2xl p-6 flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm text-[#8E8E93] mb-2"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={state === 'loading'}
                placeholder="tony@trsmobiletire.com"
                aria-describedby={errorMessage ? 'login-error' : undefined}
                className="w-full bg-[#2C2C2E] text-white rounded-xl px-4 py-3 text-base placeholder-[#48484A] border border-transparent focus:border-[#F5A623] focus:outline-none transition-colors disabled:opacity-50 min-h-[44px]"
              />
            </div>

            {errorMessage && (
              <p
                id="login-error"
                role="alert"
                className="text-[#FF3B30] text-sm"
              >
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={state === 'loading' || !email}
              className="w-full bg-[#F5A623] hover:bg-[#D4891A] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 text-base transition-colors min-h-[44px]"
            >
              {state === 'loading' ? 'Sending…' : 'Send Sign-In Link'}
            </button>
          </div>

          <p className="text-center text-[#48484A] text-sm mt-4">
            Are you a tech?{' '}
            <a
              href="/login-tech"
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: branding.primaryColor }}
            >
              Sign in with phone
            </a>
          </p>
        </form>
      )}
    </div>
  )
}
