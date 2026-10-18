import type { Rating } from '../../calls/enums/Rating'
import { ratingDirection } from '../../calls/utils/ratingDirection'
import { holdBand } from './holdBand'

/**
 * Whether a call was right over a horizon, judged on excess return: a buy
 * beat the benchmark, a sell lagged it, a hold stayed within the hold band.
 */
export function isHit(
  rating: Rating,
  excessReturn: number,
  months: number,
): boolean {
  const direction = ratingDirection(rating)
  if (direction === 0) {
    return Math.abs(excessReturn) <= holdBand(months)
  }
  return direction * excessReturn > 0
}
