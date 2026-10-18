/**
 * What a run does. Every kind ends by refreshing prices, outcomes and
 * consensus snapshots; they differ in how much they ask the sources for.
 */
export enum RunKind {
  // First sync for companies that have never been synced.
  BACKFILL = 'BACKFILL',
  // New calls since the last sync.
  WEEKLY = 'WEEKLY',
  // Re-reads the last RESYNC_DAYS to catch edited or late calls.
  MONTHLY = 'MONTHLY',
  // No source requests. Recomputes scores from what is stored.
  REFRESH = 'REFRESH',
  // Calls were pushed in by the browser extension; rescores afterwards.
  BROWSER_SYNC = 'BROWSER_SYNC',
}
