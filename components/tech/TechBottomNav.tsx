'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, BookOpen } from 'lucide-react'

const items = [
  { href: '/jobs',     label: 'Jobs',     Icon: Briefcase },
  { href: '/training', label: 'Training', Icon: BookOpen  },
] as const

export function TechBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 border-t border-trs-slate bg-trs-black/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Tech navigation"
    >
      <ul className="flex max-w-lg mx-auto">
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
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
