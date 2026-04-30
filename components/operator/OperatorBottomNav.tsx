'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, DollarSign } from 'lucide-react'

const items = [
  { href: '/dashboard',      label: 'Board',   Icon: LayoutDashboard, exact: true  },
  { href: '/dashboard/jobs', label: 'Jobs',    Icon: ClipboardList,   exact: false },
  { href: '/pricing',        label: 'Pricing', Icon: DollarSign,      exact: false },
] as const

function isActive(href: string, pathname: string, exact: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

export function OperatorBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-trs-slate bg-trs-black/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Operator navigation"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ href, label, Icon, exact }) => {
          const active = isActive(href, pathname, exact)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex min-h-touch flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  active ? 'text-trs-gold' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 1.75} aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
