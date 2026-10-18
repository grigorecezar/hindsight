import { RatingBadge } from '@/components/calls/RatingBadge'
import { Num } from '@/components/ui/Num'
import { Table, Td, Th } from '@/components/ui/Table'
import { formatPercent } from '@/lib/format/formatPercent'
import { formatRate } from '@/lib/format/formatRate'
import { RATINGS_BULLISH_FIRST } from '@/server/modules/calls/constants/RATINGS_BULLISH_FIRST'
import { Rating } from '@/server/modules/calls/enums/Rating'
import type { BucketStats } from '@/server/modules/analytics/types/BucketStats'
import { HORIZONS } from '@/server/modules/outcomes/constants/HORIZONS'
import { Horizon } from '@/server/modules/outcomes/enums/Horizon'

/**
 * How fast calls paid off: the share that moved the target distance their
 * way within each horizon, the typical wait, and the swing along the way.
 */
export function TimingTable({
  grid,
  targetMove,
}: {
  grid: BucketStats[]
  targetMove: number
}) {
  const cell = (rating: Rating, horizon: Horizon) =>
    grid.find(
      (bucket) => bucket.rating === rating && bucket.horizon === horizon,
    )
  const directional = RATINGS_BULLISH_FIRST.filter(
    (rating) => rating !== Rating.HOLD,
  )
  const move = formatPercent(targetMove, { isSigned: false, digits: 0 })

  return (
    <Table caption={`Share of calls that moved ${move} their way, by horizon`}>
      <thead>
        <tr>
          <Th>Rating</Th>
          {HORIZONS.map((definition) => (
            <Th key={definition.horizon} align="right">
              {move} by {definition.shortLabel}
            </Th>
          ))}
          <Th align="right">Typical wait</Th>
          <Th align="right">Swing, 3 months</Th>
        </tr>
      </thead>
      <tbody>
        {directional.map((rating) => {
          // The longest horizon with any target hits says the most about the wait.
          const year = [...HORIZONS]
            .reverse()
            .map(({ horizon }) => cell(rating, horizon))
            .find((bucket) => bucket?.medianDaysToTarget != null)
          const quarter = cell(rating, Horizon.THREE_MONTHS)
          return (
            <tr key={rating}>
              <Td className="whitespace-nowrap">
                <RatingBadge rating={rating} />
              </Td>
              {HORIZONS.map(({ horizon }) => {
                const bucket = cell(rating, horizon)
                return (
                  <Td key={horizon} align="right">
                    <Num>
                      {bucket?.sampleSize ? formatRate(bucket.targetRate) : ''}
                    </Num>
                    {bucket?.sampleSize ? (
                      <span className="block text-[12px] text-ink/65 tabular-nums">
                        {formatRate(bucket.stopRate)} went against
                      </span>
                    ) : null}
                  </Td>
                )
              })}
              <Td align="right" className="whitespace-nowrap">
                <Num>
                  {year?.medianDaysToTarget != null
                    ? `${Math.round(year.medianDaysToTarget)} days`
                    : ''}
                </Num>
              </Td>
              <Td align="right" className="whitespace-nowrap">
                {quarter?.sampleSize ? (
                  <span className="tabular-nums">
                    {formatPercent(quarter.medianRunup)}{' '}
                    <span className="text-ink/40">/</span>{' '}
                    {formatPercent(quarter.medianDrawdown)}
                  </span>
                ) : (
                  <Num>{''}</Num>
                )}
              </Td>
            </tr>
          )
        })}
      </tbody>
    </Table>
  )
}
