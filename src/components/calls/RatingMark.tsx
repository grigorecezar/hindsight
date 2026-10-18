import { Rating } from '@/server/modules/calls/enums/Rating'
import { ratingDirection } from '@/server/modules/calls/utils/ratingDirection'
import { RATING_COLORS } from './ratingColors'

/**
 * The shape for a rating: up for buys, down for sells, round for a hold.
 * Shape carries direction and color carries strength, so a rating never
 * relies on color alone.
 */
export function RatingMark({
  rating,
  size = 10,
}: {
  rating: Rating
  size?: number
}) {
  const direction = ratingDirection(rating)
  const color = RATING_COLORS[rating]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      aria-hidden
      className="shrink-0"
    >
      {direction === 0 ? (
        <circle cx="5" cy="5" r="4" fill={color} />
      ) : (
        <path
          d={direction > 0 ? 'M5 1 L9.5 9 L0.5 9 Z' : 'M5 9 L9.5 1 L0.5 1 Z'}
          fill={color}
        />
      )}
    </svg>
  )
}
