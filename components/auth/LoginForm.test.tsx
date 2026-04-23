import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'
import { TEST_TENANT_BRANDING } from '@/tests/fixtures/branding'

const testBranding = TEST_TENANT_BRANDING

// Mock Supabase client
const mockSignInWithOtp = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
    },
  }),
}))

// Mock env
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')

describe('LoginForm', () => {
  beforeEach(() => {
    mockSignInWithOtp.mockReset()
  })

  it('renders email input and submit button', () => {
    render(<LoginForm branding={testBranding} />)
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send sign-in link/i })).toBeInTheDocument()
  })

  it('submit button is disabled when email is empty', () => {
    render(<LoginForm branding={testBranding} />)
    expect(screen.getByRole('button', { name: /send sign-in link/i })).toBeDisabled()
  })

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup()
    render(<LoginForm branding={testBranding} />)

    await user.type(screen.getByLabelText(/email address/i), 'notanemail')
    await user.click(screen.getByRole('button', { name: /send sign-in link/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/valid email/i)
    expect(mockSignInWithOtp).not.toHaveBeenCalled()
  })

  it('calls signInWithOtp with correct email on valid submit', async () => {
    const user = userEvent.setup()
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<LoginForm branding={testBranding} />)

    await user.type(screen.getByLabelText(/email address/i), 'tony@trs.com')
    await user.click(screen.getByRole('button', { name: /send sign-in link/i }))

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'tony@trs.com',
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining('/api/auth/callback'),
        }),
      })
    })
  })

  it('shows success state after OTP sent', async () => {
    const user = userEvent.setup()
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<LoginForm branding={testBranding} />)

    await user.type(screen.getByLabelText(/email address/i), 'tony@trs.com')
    await user.click(screen.getByRole('button', { name: /send sign-in link/i }))

    expect(await screen.findByRole('status')).toHaveTextContent(/check your email/i)
    expect(screen.getByText(/tony@trs\.com/i)).toBeInTheDocument()
  })

  it('shows error when supabase returns error', async () => {
    const user = userEvent.setup()
    mockSignInWithOtp.mockResolvedValue({ error: new Error('Rate limited') })
    render(<LoginForm branding={testBranding} />)

    await user.type(screen.getByLabelText(/email address/i), 'tony@trs.com')
    await user.click(screen.getByRole('button', { name: /send sign-in link/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not send/i)
  })

  it('includes redirect param in callback URL when provided', async () => {
    const user = userEvent.setup()
    mockSignInWithOtp.mockResolvedValue({ error: null })
    render(<LoginForm branding={testBranding} redirectTo="/dashboard" />)

    await user.type(screen.getByLabelText(/email address/i), 'tony@trs.com')
    await user.click(screen.getByRole('button', { name: /send sign-in link/i }))

    await waitFor(() => {
      expect(mockSignInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            emailRedirectTo: expect.stringContaining('redirect=%2Fdashboard'),
          }),
        }),
      )
    })
  })

  it('shows server error for expired link', () => {
    render(<LoginForm branding={testBranding} serverError="auth_failed" />)
    expect(screen.getByRole('alert')).toHaveTextContent(/sign-in link expired/i)
  })

  it('link to tech login is visible', () => {
    render(<LoginForm branding={testBranding} />)
    const link = screen.getByRole('link', { name: /sign in with phone/i })
    expect(link).toHaveAttribute('href', '/login-tech')
  })
})
