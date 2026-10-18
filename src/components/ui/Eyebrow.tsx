import type { ReactNode } from 'react'

/** Small tracked label above a heading. */
export function Eyebrow({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={`text-[11px] tracking-[0.22em] text-ink/65 uppercase ${className}`}
    >
      {children}
    </p>
  )
}
