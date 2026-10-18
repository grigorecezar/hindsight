import type { Rating } from '../../calls/enums/Rating'
import type { Horizon } from '../../outcomes/enums/Horizon'
import type { CallOutcome } from './CallOutcome'

/** One call as the company page lists it. */
export interface CallRow {
  id: string
  publishedAt: Date
  rating: Rating
  companyId: string
  ticker: string
  companyName: string | null
  authorId: string | null
  authorName: string | null
  authorSlug: string | null
  authorUrl: string | null
  title: string | null
  url: string | null
  entryDate: string | null
  entryPrice: number | null
  // From the entry to the latest close, for calls still playing out.
  sinceEntry: Omit<CallOutcome, 'isHit'> | null
  outcomes: Partial<Record<Horizon, CallOutcome>>
}
