export interface IngestPagesResult {
  articleCount: number
  savedCount: number
  unratedCount: number
  // Articles whose rating exists but came back hidden (not logged in, or no
  // Premium). The extension stops when a page is all hidden.
  lockedCount: number
}
