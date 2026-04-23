import { getCurrentTenantBranding } from '@/lib/branding/server'
import { TenantLogo } from '@/components/branding/TenantLogo'

type ShellVariant = 'tech' | 'operator'

const SUBTITLE: Record<ShellVariant, string> = {
  tech: 'Field',
  operator: 'Console',
}

export async function AppShellHeader({ variant }: { variant: ShellVariant }) {
  const branding = await getCurrentTenantBranding()

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-black/80 backdrop-blur-md supports-[backdrop-filter]:bg-black/60">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
        <span
          className="hidden h-9 w-1 shrink-0 rounded-full sm:block"
          style={{ backgroundColor: branding.primaryColor }}
          aria-hidden
        />
        <TenantLogo branding={branding} size="sm" priority />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-semibold tracking-tight text-white truncate">
            {branding.companyName}
          </p>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#8E8E93]">
            {SUBTITLE[variant]}
          </p>
        </div>
      </div>
    </header>
  )
}
