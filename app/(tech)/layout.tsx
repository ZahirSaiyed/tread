import { TechBottomNav } from '@/components/tech/TechBottomNav'

export default function TechLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#000000] flex flex-col">
      <div className="flex-1 flex flex-col min-h-0">{children}</div>
      <TechBottomNav />
    </div>
  )
}
