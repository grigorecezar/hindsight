import type { Author } from '../../authors/types/Author'
import type { AccuracyReport } from './AccuracyReport'
import type { AuthorTrackRecord } from './AuthorTrackRecord'
import type { CallRow } from './CallRow'

/** Everything the author page shows. */
export interface AuthorReport {
  author: Author
  record: AuthorTrackRecord | null
  // The author's latest call on each company in the last year, newest first.
  currentViews: CallRow[]
  accuracy: AccuracyReport
  calls: CallRow[]
  // True once the author's own list has been synced at least once.
  isSynced: boolean
  benchmarkTicker: string
}
