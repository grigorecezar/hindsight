/**
 * A stretch of time to read calls for. `until` is null for "up to now". A
 * backfill window reaches into history the company has not covered yet.
 */
export interface SyncWindow {
  since: Date
  until: Date | null
  isBackfill: boolean
}
