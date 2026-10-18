import { RATINGS_BULLISH_FIRST } from '@/server/modules/calls/constants/RATINGS_BULLISH_FIRST'
import { RatingBadge } from './RatingBadge'

export function RatingLegend() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink/75">
      {RATINGS_BULLISH_FIRST.map((rating) => (
        <li key={rating}>
          <RatingBadge rating={rating} />
        </li>
      ))}
    </ul>
  )
}
