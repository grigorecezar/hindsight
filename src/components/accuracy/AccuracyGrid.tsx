import { RatingBadge } from '@/components/calls/RatingBadge'
import { Num } from '@/components/ui/Num'
import { Table, Td, Th } from '@/components/ui/Table'
import { formatPercent } from '@/lib/format/formatPercent'
import { formatRate } from '@/lib/format/formatRate'
import { RATINGS_BULLISH_FIRST } from '@/server/modules/calls/constants/RATINGS_BULLISH_FIRST'
import type { Rating } from '@/server/modules/calls/enums/Rating'
import { ratingDirection } from '@/server/modules/calls/utils/ratingDirection'
import type { BucketStats } from '@/server/modules/analytics/types/BucketStats'
import { HORIZONS } from '@/server/modules/outcomes/constants/HORIZONS'

/**
 * Rating by horizon. Each cell: how often the call was right, what acting on
 * it earned over the S&P on average (a sell earns when the stock lags, so
 * positive is always good), and how many calls that rests on.
 */
export function AccuracyGrid({ grid }: { grid: BucketStats[] }) {
  const cell = (rating: string, horizon: string) =>
    grid.find(
      (bucket) => bucket.rating === rating && bucket.horizon === horizon,
    )

  return (
    <Table caption="Hit rate and average excess return by rating and horizon">
      <thead>
        <tr>
          <Th>Rating</Th>
          {HORIZONS.map((definition) => (
            <Th key={definition.horizon} align="right">
              {definition.label}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {RATINGS_BULLISH_FIRST.map((rating) => (
          <tr key={rating}>
            <Td className="whitespace-nowrap">
              <RatingBadge rating={rating} />
            </Td>
            {HORIZONS.map(({ horizon }) => {
              const bucket = cell(rating, horizon)
              return (
                <Td key={horizon} align="right" className="whitespace-nowrap">
                  {bucket && bucket.sampleSize > 0 ? (
                    <>
                      <span className="block text-[15px] font-medium tabular-nums">
                        {formatRate(bucket.hitRate)}
                      </span>
                      <span className="block text-ink/75 tabular-nums">
                        <EdgeText
                          rating={rating}
                          meanExcess={bucket.meanExcess}
                        />
                      </span>
                      <span className="block text-[12px] text-ink/65 tabular-nums">
                        {bucket.sampleSize}{' '}
                        {bucket.sampleSize === 1 ? 'call' : 'calls'}
                      </span>
                    </>
                  ) : (
                    <Num>{''}</Num>
                  )}
                </Td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

/** A buy or sell shows what following it earned; a hold, the stock against the S&P. */
function EdgeText({
  rating,
  meanExcess,
}: {
  rating: Rating
  meanExcess: number | null
}) {
  const direction = ratingDirection(rating)
  if (direction === 0 || meanExcess === null) {
    return <>{formatPercent(meanExcess)} vs S&amp;P</>
  }
  return <>{formatPercent(direction * meanExcess)} by following it</>
}
