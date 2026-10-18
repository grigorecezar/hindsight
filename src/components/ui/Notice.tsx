import type { ReactNode } from 'react'

/** A quiet callout for setup problems and empty states. */
export function Notice({
  title,
  children,
}: {
  title: string
  children?: ReactNode
}) {
  return (
    <div className="mb-10 rounded-lg border border-ink/15 bg-paper px-5 py-4 text-sm">
      <p className="font-medium text-ink">{title}</p>
      {children ? <div className="mt-1 text-ink/75">{children}</div> : null}
    </div>
  )
}
