import type { Rating } from '../../calls/enums/Rating'
import type { ConsensusContribution } from './ConsensusContribution'
import type { ExpectedByHorizon } from './ExpectedByHorizon'

/** The blended view on one company as of one day. */
export interface Consensus {
  asOf: string
  // -2 (Strong Sell) to 2 (Strong Buy).
  score: number
  rating: Rating
  callCount: number
  authorCount: number
  // How many equally weighted calls the blend is worth.
  effectiveCallCount: number
  price: number | null
  expected: ExpectedByHorizon
  contributions: ConsensusContribution[]
}
