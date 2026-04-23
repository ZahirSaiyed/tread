import { AppShellHeader } from '@/components/branding/AppShellHeader'
import { TechBottomNav } from '@/components/tech/TechBottomNav'

export default async function TechLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#000000]">
      <AppShellHeader variant="tech" />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <TechBottomNav />
    </div>
  )
}
