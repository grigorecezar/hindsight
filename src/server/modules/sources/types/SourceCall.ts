import type { Rating } from '../../calls/enums/Rating'
import type { SourceAuthor } from './SourceAuthor'

/**
 * A call as a source hands it over, already translated into our ratings.
 * Every source adapter produces exactly this shape.
 */
export interface SourceCall {
  externalId: string
  ticker: string
  rating: Rating
  publishedAt: Date
  title: string | null
  url: string | null
  author: SourceAuthor | null
  // A small slice of the source's own payload, kept for debugging.
  raw: unknown
}
