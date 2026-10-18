import type { ReactNode } from 'react'
import { Plane } from './Plane'

/**
 * A data table on a paper plane. Scrolls sideways inside its plane on a
 * narrow screen, so the page itself never does.
 */
export function Table({
  children,
  caption,
}: {
  children: ReactNode
  caption?: string
}) {
  return (
    <Plane className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm [&_tbody_tr:last-child_td]:border-b-0">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </Plane>
  )
}

export function Th({
  children,
  align = 'left',
  className = '',
}: {
  children?: ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  return (
    <th
      scope="col"
      className={`border-b border-ink/15 px-3 py-3 text-[11px] first:pl-4 last:pr-4 font-normal tracking-[0.14em] whitespace-nowrap text-ink/65 uppercase ${align === 'right' ? 'text-right' : ''} ${className}`}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  align = 'left',
  className = '',
}: {
  children?: ReactNode
  align?: 'left' | 'right'
  className?: string
}) {
  return (
    <td
      className={`border-b border-ink/10 px-3 py-3 align-top first:pl-4 last:pr-4 ${align === 'right' ? 'text-right' : ''} ${className}`}
    >
      {children}
    </td>
  )
}
