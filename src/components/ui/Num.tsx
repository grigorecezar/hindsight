import type { ReactNode } from 'react'
import { Empty } from './Empty'

/** A right aligned figure for table cells, with the faint mark when empty. */
export function Num({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const isEmpty = children === '' || children === null || children === undefined
  return (
    <span className={`tabular-nums ${className}`}>
      {isEmpty ? <Empty /> : children}
    </span>
  )
}
