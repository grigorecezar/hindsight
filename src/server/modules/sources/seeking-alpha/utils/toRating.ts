import { Rating } from '../../../calls/enums/Rating'

// Seeking Alpha calls a rating a "sentiment". Older articles used long and
// short; labels are accepted too in case a listing renames them.
const RATINGS_BY_SENTIMENT: Record<string, Rating> = {
  very_bullish: Rating.STRONG_BUY,
  strong_buy: Rating.STRONG_BUY,
  bullish: Rating.BUY,
  buy: Rating.BUY,
  long: Rating.BUY,
  neutral: Rating.HOLD,
  hold: Rating.HOLD,
  bearish: Rating.SELL,
  sell: Rating.SELL,
  short: Rating.SELL,
  very_bearish: Rating.STRONG_SELL,
  strong_sell: Rating.STRONG_SELL,
}

/** Our rating for a Seeking Alpha sentiment, or null when it has none. */
export function toRating(sentiment: unknown): Rating | null {
  if (typeof sentiment !== 'string') {
    return null
  }

  const key = sentiment
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  return RATINGS_BY_SENTIMENT[key] ?? null
}
