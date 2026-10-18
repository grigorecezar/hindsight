import { Rating } from '../enums/Rating'

const LABELS: Record<Rating, string> = {
  [Rating.STRONG_SELL]: 'Strong Sell',
  [Rating.SELL]: 'Sell',
  [Rating.HOLD]: 'Hold',
  [Rating.BUY]: 'Buy',
  [Rating.STRONG_BUY]: 'Strong Buy',
}

export function ratingLabel(rating: Rating): string {
  return LABELS[rating]
}
