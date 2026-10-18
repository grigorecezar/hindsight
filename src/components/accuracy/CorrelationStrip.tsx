import { Plane } from '@/components/ui/Plane'
import { formatScore } from '@/lib/format/formatScore'
import type { HorizonCorrelation } from '@/server/modules/analytics/types/HorizonCorrelation'
import { horizonDefinition } from '@/server/modules/outcomes/utils/horizonDefinition'

/** One figure per horizon: do stronger ratings rank with better returns? */
export function CorrelationStrip({
  correlations,
}: {
  correlations: HorizonCorrelation[]
}) {
  return (
    <Plane className="grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-5">
      {correlations.map((correlation) => (
        <div key={correlation.horizon} className="px-4 py-4">
          <p className="text-[11px] tracking-[0.14em] text-ink/65 uppercase">
            {horizonDefinition(correlation.horizon).label}
          </p>
          <p className="mt-2 font-serif text-[1.75rem] leading-none font-medium tabular-nums">
            {correlation.value === null ? (
              <span className="text-ink/40">·</span>
            ) : (
              formatScore(correlation.value)
            )}
          </p>
          <p className="mt-2 text-[12px] text-ink/65 tabular-nums">
            {correlation.sampleSize} outcomes
          </p>
        </div>
      ))}
    </Plane>
  )
}
