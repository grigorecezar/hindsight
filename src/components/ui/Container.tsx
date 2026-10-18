import type { ReactNode } from 'react'

/** The page column. Wide, because most pages are tables. */
export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-[72rem] px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  )
}
