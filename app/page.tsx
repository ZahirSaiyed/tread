import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/session'
import { defaultRedirectForRole } from '@/lib/auth/roles'

export default async function Home() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  redirect(defaultRedirectForRole(user.role))
}
