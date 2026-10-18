import { Rating } from '../enums/Rating'

/** The nearest rating to a score between -2 and 2. */
export function ratingFromScore(score: number): Rating {
  if (score >= 1.5) {
    return Rating.STRONG_BUY
  }
  if (score >= 0.5) {
    return Rating.BUY
  }
  if (score > -0.5) {
    return Rating.HOLD
  }
  if (score > -1.5) {
    return Rating.SELL
  }
  return Rating.STRONG_SELL
}
