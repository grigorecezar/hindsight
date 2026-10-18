import { Rating } from '../enums/Rating'

/** Display order for tables: most bullish first. */
export const RATINGS_BULLISH_FIRST: readonly Rating[] = [
  Rating.STRONG_BUY,
  Rating.BUY,
  Rating.HOLD,
  Rating.SELL,
  Rating.STRONG_SELL,
]
