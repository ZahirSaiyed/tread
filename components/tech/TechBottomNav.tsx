'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/jobs', label: 'Jobs' },
  { href: '/training', label: 'Training' },
] as const

export function TechBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-trs-slate bg-trs-black/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Tech navigation"
    >
      <ul className="flex max-w-lg mx-auto">
        {items.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex min-h-touch flex-col items-center justify-center text-sm font-medium transition-colors ${
                  active ? 'text-trs-gold' : 'text-[#8E8E93] hover:text-white'
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
