import { RATING_COLORS } from '@/components/calls/ratingColors'
import { RATINGS_BULLISH_FIRST } from '@/server/modules/calls/constants/RATINGS_BULLISH_FIRST'
import type { Rating } from '@/server/modules/calls/enums/Rating'
import { ratingLabel } from '@/server/modules/calls/utils/ratingLabel'

/**
 * How a set of calls split across ratings: a thin stacked bar, most bullish
 * on the left, with the counts written out so color is never the only cue.
 */
export function RatingMix({ mix }: { mix: Partial<Record<Rating, number>> }) {
  const parts = RATINGS_BULLISH_FIRST.flatMap((rating) =>
    mix[rating] ? [{ rating, count: mix[rating]! }] : [],
  )
  const total = parts.reduce((sum, part) => sum + part.count, 0)
  if (total === 0) {
    return null
  }

  return (
    <div>
      <div
        className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full"
        aria-hidden
      >
        {parts.map((part) => (
          <span
            key={part.rating}
            style={{
              width: `${(part.count / total) * 100}%`,
              background: RATING_COLORS[part.rating],
            }}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[12px] text-ink/65">
        {parts
          .map((part) => `${part.count} ${ratingLabel(part.rating)}`)
          .join(' · ')}
      </p>
    </div>
  )
}
