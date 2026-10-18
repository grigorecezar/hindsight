import { Rating } from '../enums/Rating'

const SCORES: Record<Rating, number> = {
  [Rating.STRONG_SELL]: -2,
  [Rating.SELL]: -1,
  [Rating.HOLD]: 0,
  [Rating.BUY]: 1,
  [Rating.STRONG_BUY]: 2,
}

/** A rating as a number from -2 (Strong Sell) to 2 (Strong Buy). */
export function ratingScore(rating: Rating): number {
  return SCORES[rating]
}
