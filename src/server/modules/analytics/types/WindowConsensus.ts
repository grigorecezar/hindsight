import type { Rating } from '../../calls/enums/Rating'
import type { WindowView } from './WindowView'

/**
 * What authors think over one window (the last 1, 3, 6 or 12 months): the
 * average of each author's latest rating in it, every author counted once.
 */
export interface WindowConsensus {
  months: number
  since: string
  // -2 (Strong Sell) to 2 (Strong Buy); null when nobody wrote in the window.
  score: number | null
  rating: Rating | null
  authorCount: number
  mix: Partial<Record<Rating, number>>
  // Newest first.
  views: WindowView[]
}
