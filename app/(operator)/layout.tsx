import { AppShellHeader } from '@/components/branding/AppShellHeader'

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#000000]">
      <AppShellHeader variant="operator" />
      {children}
    </div>
  )
}
