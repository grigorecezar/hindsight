import { Plane } from '@/components/ui/Plane'
import type { ReactNode } from 'react'

/** A row of headline figures. */
export function StatStrip({
  stats,
}: {
  stats: { label: string; value: ReactNode; note?: string }[]
}) {
  return (
    <Plane className="grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-5">
      {stats.map((stat) => (
        <div key={stat.label} className="px-4 py-4">
          <p className="text-[11px] tracking-[0.14em] text-ink/65 uppercase">
            {stat.label}
          </p>
          <p className="mt-2 font-serif text-[1.75rem] leading-none font-medium tabular-nums">
            {stat.value}
          </p>
          {stat.note ? (
            <p className="mt-2 text-[12px] text-ink/65">{stat.note}</p>
          ) : null}
        </div>
      ))}
    </Plane>
  )
}
