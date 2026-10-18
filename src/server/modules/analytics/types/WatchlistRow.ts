import type { Rating } from '../../calls/enums/Rating'
import type { Company } from '../../companies/types/Company'
import type { LatestClose } from '../../prices/types/LatestClose'
import type { WindowConsensus } from './WindowConsensus'

/** One company on the home page. */
export interface WatchlistRow {
  company: Company
  // False until the first sync of the company has finished.
  isSynced: boolean
  // The default window (3 months), as on the company page.
  consensus: WindowConsensus
  recentCallCount: number
  lastCall: {
    publishedAt: Date
    rating: Rating
    authorName: string | null
  } | null
  latestClose: LatestClose | null
}
