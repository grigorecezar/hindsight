import Link from 'next/link'
import { Suspense } from 'react'
import { Container } from '@/components/ui/Container'
import { NavLink } from './NavLink'

const NAV = [
  { href: '/', label: 'Companies' },
  { href: '/accuracy', label: 'Accuracy' },
  { href: '/authors', label: 'Authors' },
  { href: '/runs', label: 'Runs' },
]

export function SiteHeader() {
  return (
    <header className="pt-8 pb-10 md:pt-10 md:pb-14">
      <Container className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
        <Link
          href="/"
          className="font-serif text-[1.25rem] font-medium tracking-[-0.01em]"
        >
          Hindsight<span className="text-ink/40">.</span>
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-sm">
            {NAV.map((item) => (
              <li key={item.href}>
                {/* The active state needs the URL, which a dynamic route only
                    has at request time, so the plain link stands in. */}
                <Suspense
                  fallback={
                    <Link
                      href={item.href}
                      className="text-ink/65 hover:text-ink"
                    >
                      {item.label}
                    </Link>
                  }
                >
                  <NavLink href={item.href}>{item.label}</NavLink>
                </Suspense>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </header>
  )
}
