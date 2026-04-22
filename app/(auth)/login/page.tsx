import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = {
  title: 'Sign In — TRS Platform',
}

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect, error } = await searchParams
  return <LoginForm redirectTo={redirect} serverError={error} />
}
