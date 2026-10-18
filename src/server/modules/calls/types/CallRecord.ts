import type { Rating } from '../enums/Rating'

/** A stored call joined with its company and author. Internal only. */
export interface CallRecord {
  id: string
  source: string
  companyId: string
  ticker: string
  companyName: string | null
  authorId: string | null
  authorName: string | null
  // The author's id on the source; for Seeking Alpha, their profile slug.
  authorSlug: string | null
  authorUrl: string | null
  rating: Rating
  publishedAt: Date
  // The New York calendar date it was published, YYYY-MM-DD.
  publishedOn: string
  entryDate: string | null
  entryPrice: number | null
  title: string | null
  url: string | null
}
