import type { Rating } from '../../calls/enums/Rating'

/** One call's part in a consensus. */
export interface ConsensusContribution {
  callId: string
  authorId: string | null
  authorName: string | null
  authorSlug: string | null
  rating: Rating
  publishedAt: Date
  title: string | null
  url: string | null
  recencyWeight: number
  authorWeight: number
  // This call's share of the total weight, 0 to 1.
  share: number
}
