import { PhoneOtpForm } from '@/components/auth/PhoneOtpForm'

export const metadata = {
  title: 'Tech Sign In — TRS Platform',
}

interface LoginTechPageProps {
  searchParams: Promise<{ redirect?: string }>
}

export default async function LoginTechPage({ searchParams }: LoginTechPageProps) {
  const { redirect } = await searchParams
  return <PhoneOtpForm redirectTo={redirect} />
}
