// Operator shell layout — navigation will be added in SM 3.1
export default function OperatorLayout({
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
