import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PhoneOtpForm } from './PhoneOtpForm'

const mockSignInWithOtp = vi.fn()
const mockVerifyOtp = vi.fn()
const mockSelect = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: mockSelect,
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/auth/roles', () => ({
  defaultRedirectForRole: (role: string) => (role === 'tech' ? '/jobs' : '/dashboard'),
}))

describe('PhoneOtpForm', () => {
  beforeEach(() => {
    mockSignInWithOtp.mockReset()
    mockVerifyOtp.mockReset()
    mockSelect.mockReset()
  })

  it('renders phone input on first step', () => {
    render(<PhoneOtpForm />)
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send code/i })).toBeInTheDocument()
  })

  it('normalizes phone number: strips dashes and prepends +1', async () => {
    const user = userEvent.setup()
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<PhoneOtpForm />)

    await user.type(screen.getByLabelText(/phone number/i), '703-555-1234')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        phone: '+17035551234',
      })
    })
  })

  it('shows validation error for invalid phone', async () => {
    const user = userEvent.setup()
    render(<PhoneOtpForm />)

    await user.type(screen.getByLabelText(/phone number/i), '12345')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('advances to OTP step after sending code', async () => {
    const user = userEvent.setup()
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<PhoneOtpForm />)

    await user.type(screen.getByLabelText(/phone number/i), '+17035551234')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    expect(await screen.findByLabelText(/verification code/i)).toBeInTheDocument()
    expect(screen.getByText(/\+17035551234/)).toBeInTheDocument()
  })

  it('only allows digits in OTP field', async () => {
    const user = userEvent.setup()
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<PhoneOtpForm />)

    await user.type(screen.getByLabelText(/phone number/i), '+17035551234')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    const otpInput = await screen.findByLabelText(/verification code/i)
    await user.type(otpInput, 'abc123def')

    expect(otpInput).toHaveValue('123')
  })

  it('verify button disabled until 6 digits entered', async () => {
    const user = userEvent.setup()
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<PhoneOtpForm />)

    await user.type(screen.getByLabelText(/phone number/i), '+17035551234')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    const otpInput = await screen.findByLabelText(/verification code/i)
    await user.type(otpInput, '12345')

    expect(screen.getByRole('button', { name: /verify code/i })).toBeDisabled()
  })

  it('shows error for incorrect OTP', async () => {
    const user = userEvent.setup()
    mockSignInWithOtp.mockResolvedValue({ error: null })
    mockVerifyOtp.mockResolvedValue({ data: { user: null }, error: new Error('Invalid OTP') })
    render(<PhoneOtpForm />)

    await user.type(screen.getByLabelText(/phone number/i), '+17035551234')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    const otpInput = await screen.findByLabelText(/verification code/i)
    await user.type(otpInput, '000000')
    await user.click(screen.getByRole('button', { name: /verify code/i }))

    expect(await screen.findByText(/incorrect code/i)).toBeInTheDocument()
  })

  it('can go back to phone step from OTP step', async () => {
    const user = userEvent.setup()
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<PhoneOtpForm />)

    await user.type(screen.getByLabelText(/phone number/i), '+17035551234')
    await user.click(screen.getByRole('button', { name: /send code/i }))

    await screen.findByLabelText(/verification code/i)
    await user.click(screen.getByRole('button', { name: /different number/i }))

    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
  })

  it('link to operator login is visible', () => {
    render(<PhoneOtpForm />)
    const link = screen.getByRole('link', { name: /sign in with email/i })
    expect(link).toHaveAttribute('href', '/login')
  })
})
