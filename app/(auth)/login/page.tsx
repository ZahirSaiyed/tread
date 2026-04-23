import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'
import { DevLoginPanel } from '@/components/auth/DevLoginPanel'
import { getPublicAuthBranding } from '@/lib/branding/server'

export async function generateMetadata(): Promise<Metadata> {
  const b = getPublicAuthBranding()
  return { title: `Sign in — ${b.companyName}` }
}

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect, error } = await searchParams
  const branding = getPublicAuthBranding()
  return (
    <>
      <LoginForm branding={branding} redirectTo={redirect} serverError={error} />
      {process.env.NODE_ENV === 'development' && <DevLoginPanel />}
    </>
  )
}
