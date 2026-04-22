// Tech shell layout — bottom nav will be added in SM 2.1
export default function TechLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#000000]">
      {children}
    </div>
  )
}
