import type { ReactNode } from 'react'
import { Eyebrow } from './Eyebrow'

/** A titled block of a page: eyebrow, heading, optional note, content. */
export function Section({
  index,
  label,
  title,
  note,
  children,
  className = '',
}: {
  index?: string
  label?: string
  title: ReactNode
  note?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`mt-16 first:mt-0 ${className}`}>
      {label ? (
        <Eyebrow className="mb-4">
          {index ? <span className="mr-3 tabular-nums">{index}</span> : null}
          {label}
        </Eyebrow>
      ) : null}
      <h2 className="font-serif text-[1.625rem] leading-[1.2] font-medium tracking-[-0.01em]">
        {title}
      </h2>
      {note ? (
        <p className="mt-3 max-w-[42rem] font-serif text-[1.0625rem] leading-[1.6] text-ink/75">
          {note}
        </p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}
