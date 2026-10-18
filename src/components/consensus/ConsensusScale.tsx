import { RATING_COLORS } from '@/components/calls/ratingColors'
import { RATINGS_BULLISH_FIRST } from '@/server/modules/calls/constants/RATINGS_BULLISH_FIRST'
import { ratingLabel } from '@/server/modules/calls/utils/ratingLabel'

/**
 * Where a consensus score sits between Strong Sell (-2) and Strong Buy
 * (+2): five labelled steps with a marker at the score.
 */
export function ConsensusScale({ score }: { score: number }) {
  const steps = [...RATINGS_BULLISH_FIRST].reverse()
  const position = ((Math.max(-2, Math.min(2, score)) + 2) / 4) * 100

  return (
    <div className="w-full max-w-[34rem]">
      <div className="relative pt-5">
        <div
          className="flex h-2 gap-[2px] overflow-hidden rounded-full"
          aria-hidden
        >
          {steps.map((rating) => (
            <span
              key={rating}
              className="flex-1 opacity-60"
              style={{ background: RATING_COLORS[rating] }}
            />
          ))}
        </div>
        <span
          aria-hidden
          className="absolute top-0 -translate-x-1/2 text-[13px] leading-none"
          style={{ left: `${position}%` }}
        >
          ▼
        </span>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink/65">
        {steps.map((rating) => (
          <span
            key={rating}
            className="w-1/5 text-center first:text-left last:text-right"
          >
            {ratingLabel(rating)}
          </span>
        ))}
      </div>
    </div>
  )
}
