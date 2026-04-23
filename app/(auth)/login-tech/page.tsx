import type { Metadata } from 'next'
import { PhoneOtpForm } from '@/components/auth/PhoneOtpForm'
import { getPublicAuthBranding } from '@/lib/branding/server'

export async function generateMetadata(): Promise<Metadata> {
  const b = getPublicAuthBranding()
  return { title: `Tech sign in — ${b.companyName}` }
}

interface LoginTechPageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginTechPage({ searchParams }: LoginTechPageProps) {
  const { redirect } = await searchParams
  const branding = getPublicAuthBranding()
  return <PhoneOtpForm branding={branding} redirectTo={redirect} />
}
