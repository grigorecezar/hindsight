/** What one source's sync of one company did. */
export interface CompanySyncResult {
  fetchedCount: number
  savedCount: number
  unratedCount: number
  requestCount: number
  quotaRemaining: number | null
}
