'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function NavLink({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  const pathname = usePathname()
  const isActive =
    href === '/'
      ? pathname === '/' || pathname.startsWith('/companies')
      : pathname.startsWith(href)

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`transition-colors hover:text-ink ${isActive ? 'text-ink' : 'text-ink/65'}`}
    >
      {children}
    </Link>
  )
}
