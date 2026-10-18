import type { Rating } from '../../calls/enums/Rating'

/** What authors said during one period: the average of every call in it. */
export interface PeriodConsensus {
  // -2 (Strong Sell) to 2 (Strong Buy).
  score: number
  rating: Rating
  callCount: number
  authorCount: number
  mix: Partial<Record<Rating, number>>
}
