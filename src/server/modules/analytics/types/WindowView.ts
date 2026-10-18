import type { Rating } from '../../calls/enums/Rating'

/** One author's latest rating inside a consensus window. */
export interface WindowView {
  callId: string
  authorName: string | null
  authorSlug: string | null
  rating: Rating
  publishedAt: Date
}
