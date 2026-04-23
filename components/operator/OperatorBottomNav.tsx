'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/dashboard', label: 'Board' },
  { href: '/dashboard/jobs', label: 'Jobs' },
  { href: '/pricing', label: 'Pricing' },
] as const

function navItemActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function OperatorBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-trs-slate bg-trs-black/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Operator navigation"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ href, label }) => {
          const isActive = navItemActive(href, pathname)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex min-h-touch flex-col items-center justify-center text-sm font-medium transition-colors ${
                  isActive ? 'text-trs-gold' : 'text-[#8E8E93] hover:text-white'
                }`}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
