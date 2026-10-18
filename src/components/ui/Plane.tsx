import type { ReactNode } from 'react'

/** A paper plane raised off the bone ground, for tables and charts. */
export function Plane({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-lg bg-paper ring-1 ring-ink/10 ${className}`}>
      {children}
    </div>
  )
}
