/** What a sync has covered so far, for a company or a followed author. */
export interface SyncProgress {
  coveredFrom: Date | null
  latestPublishedAt: Date | null
  lastSyncedAt: Date | null
}
