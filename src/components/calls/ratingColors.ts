import { Rating } from '@/server/modules/calls/enums/Rating'

/** Each rating's mark color, as the CSS variable from globals.css. */
export const RATING_COLORS: Record<Rating, string> = {
  [Rating.STRONG_BUY]: 'var(--color-rating-strong-buy)',
  [Rating.BUY]: 'var(--color-rating-buy)',
  [Rating.HOLD]: 'var(--color-rating-hold)',
  [Rating.SELL]: 'var(--color-rating-sell)',
  [Rating.STRONG_SELL]: 'var(--color-rating-strong-sell)',
}
