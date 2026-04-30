import { AppShellHeader } from '@/components/branding/AppShellHeader'
import { OperatorBottomNav } from '@/components/operator/OperatorBottomNav'

export default async function OperatorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-black">
      <AppShellHeader variant="operator" />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch]">
        {children}
      </div>
      <OperatorBottomNav />
    </div>
  )
}
