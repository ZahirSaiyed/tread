'use client'

import { useState } from 'react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { defaultRedirectForRole } from '@/lib/auth/roles'

const phoneSchema = z
  .string()
  .regex(/^\+1\d{10}$/, 'Enter a US phone number: +1 followed by 10 digits')

const otpSchema = z
  .string()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from your SMS')

interface PhoneOtpFormProps {
  redirectTo?: string
}

type Step = 'phone' | 'otp' | 'error'

export function PhoneOtpForm({ redirectTo }: PhoneOtpFormProps) {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSendOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Normalize: strip spaces/dashes, prepend +1 if missing
    const normalized = phone.replace(/[\s\-().]/g, '')
    const withCode = normalized.startsWith('+') ? normalized : `+1${normalized}`

    const result = phoneSchema.safeParse(withCode)
    if (!result.success) {
      setErrorMessage(result.error.errors[0]?.message ?? 'Invalid phone number')
      setStep('error')
      return
    }

    setLoading(true)
    setErrorMessage('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      phone: result.data,
    })

    setLoading(false)

    if (error) {
      setErrorMessage('Could not send code. Check the number and try again.')
      setStep('error')
      return
    }

    setPhone(result.data) // store normalized form
    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const result = otpSchema.safeParse(otp)
    if (!result.success) {
      setErrorMessage(result.error.errors[0]?.message ?? 'Invalid code')
      return
    }

    setLoading(true)
    setErrorMessage('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token: result.data,
      type: 'sms',
    })

    if (error || !data.user) {
      setLoading(false)
      setErrorMessage('Incorrect code or code expired. Try again.')
      return
    }

    // Fetch role and redirect
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single()

    const destination =
      redirectTo ?? defaultRedirectForRole((profile?.role as 'tech') ?? 'tech')

    window.location.href = destination
  }

  return (
    <div>
      <div className="mb-8 text-center">
        <div className="text-[#F5A623] text-2xl font-bold tracking-tight font-['Syne',sans-serif]">
          TRS
        </div>
        <p className="text-[#8E8E93] text-sm mt-1">Tech Sign In</p>
      </div>

      <div className="bg-[#1C1C1E] rounded-2xl p-6">
        {step === 'otp' ? (
          <form onSubmit={handleVerifyOtp} noValidate>
            <p className="text-white font-medium mb-1">Enter your code</p>
            <p className="text-[#8E8E93] text-sm mb-4">
              We texted a 6-digit code to{' '}
              <span className="text-white">{phone}</span>
            </p>

            <label htmlFor="otp" className="block text-sm text-[#8E8E93] mb-2">
              Verification code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              placeholder="123456"
              aria-describedby={errorMessage ? 'otp-error' : undefined}
              className="w-full bg-[#2C2C2E] text-white rounded-xl px-4 py-3 text-2xl tracking-widest text-center placeholder-[#48484A] border border-transparent focus:border-[#F5A623] focus:outline-none transition-colors disabled:opacity-50 min-h-[44px] mb-4 font-['JetBrains_Mono',monospace]"
            />

            {errorMessage && (
              <p id="otp-error" role="alert" className="text-[#FF3B30] text-sm mb-4">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-[#F5A623] hover:bg-[#D4891A] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 text-base transition-colors min-h-[44px]"
            >
              {loading ? 'Verifying…' : 'Verify Code'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('phone')
                setOtp('')
                setErrorMessage('')
              }}
              className="w-full mt-3 text-[#8E8E93] text-sm hover:text-white transition-colors min-h-[44px]"
            >
              Use a different number
            </button>
          </form>
        ) : (
          <form onSubmit={handleSendOtp} noValidate>
            <label
              htmlFor="phone"
              className="block text-sm text-[#8E8E93] mb-2"
            >
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
              placeholder="+1 (703) 555-0000"
              aria-describedby={errorMessage ? 'phone-error' : undefined}
              className="w-full bg-[#2C2C2E] text-white rounded-xl px-4 py-3 text-base placeholder-[#48484A] border border-transparent focus:border-[#F5A623] focus:outline-none transition-colors disabled:opacity-50 min-h-[44px] mb-4"
            />

            {errorMessage && (
              <p id="phone-error" role="alert" className="text-[#FF3B30] text-sm mb-4">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !phone}
              className="w-full bg-[#F5A623] hover:bg-[#D4891A] disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold rounded-xl py-3 text-base transition-colors min-h-[44px]"
            >
              {loading ? 'Sending…' : 'Send Code'}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-[#48484A] text-sm mt-4">
        Are you an operator?{' '}
        <a href="/login" className="text-[#F5A623] hover:underline">
          Sign in with email
        </a>
      </p>
    </div>
  )
}
