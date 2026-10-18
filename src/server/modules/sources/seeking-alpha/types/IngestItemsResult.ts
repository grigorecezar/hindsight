export interface IngestItemsResult {
  savedCount: number
  unratedCount: number
  // Rows whose date could not be read. Reported so a page change shows up.
  undatedCount: number
  // The oldest date in the batch, so the extension knows when to stop.
  oldestPublishedAt: string | null
}
