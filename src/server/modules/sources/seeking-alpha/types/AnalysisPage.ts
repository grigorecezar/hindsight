import type { SourceCall } from '../../types/SourceCall'
import type { UnratedArticle } from './UnratedArticle'

/** One page of a ticker's analysis, parsed. */
export interface AnalysisPage {
  articleCount: number
  oldestPublishedAt: Date | null
  // False when the page carries no ratings at all (the listing strips them).
  hasRatingData: boolean
  calls: SourceCall[]
  // Articles on the company that carried no rating we could read.
  unratedArticles: UnratedArticle[]
  // Of those, the ones whose rating exists but came back hidden.
  lockedArticleCount: number
}
