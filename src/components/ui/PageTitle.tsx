import type { ReactNode } from 'react'
import { Eyebrow } from './Eyebrow'

export function PageTitle({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  lede?: ReactNode
}) {
  return (
    <div className="mb-12 max-w-[42rem]">
      {eyebrow ? <Eyebrow className="mb-5">{eyebrow}</Eyebrow> : null}
      <h1 className="font-serif text-[2.25rem] leading-[1.1] font-medium tracking-[-0.015em] md:text-[2.75rem]">
        {title}
      </h1>
      {lede ? (
        <p className="mt-5 font-serif text-[1.125rem] leading-[1.65] text-ink/75">
          {lede}
        </p>
      ) : null}
    </div>
  )
}
