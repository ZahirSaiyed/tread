export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="auth-marketing flex min-h-screen items-center justify-center bg-[#000000] px-4 py-10">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
