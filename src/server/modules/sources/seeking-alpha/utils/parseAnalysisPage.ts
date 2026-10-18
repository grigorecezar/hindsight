import type { SourceCall } from '../../types/SourceCall'
import type { AnalysisPage } from '../types/AnalysisPage'
import type { JsonApiResource } from '../types/JsonApiResource'
import type { UnratedArticle } from '../types/UnratedArticle'
import { SeekingAlphaDocument } from './SeekingAlphaDocument'
import { toRating } from './toRating'
import { toTickerSlug } from './toTickerSlug'

/**
 * Turns one analysis document (a list page or a single article's details)
 * into calls on `ticker`. Articles only mentioning the ticker in passing are
 * dropped: a call is a rating on a company the article is about.
 */
export function parseAnalysisPage(
  value: unknown,
  ticker: string,
): AnalysisPage {
  const document = SeekingAlphaDocument.from(value)
  const tickerSlug = toTickerSlug(ticker)
  const articles = document.articles()

  const calls: SourceCall[] = []
  const unratedArticles: UnratedArticle[] = []
  let oldestPublishedAt: Date | null = null
  let lockedArticleCount = 0

  for (const article of articles) {
    const publishedAt = document.publishedAt(article)
    if (!publishedAt) {
      continue
    }
    oldestPublishedAt = older(oldestPublishedAt, publishedAt)

    if (!isAbout(document, article, tickerSlug)) {
      continue
    }

    const sentiment = document.sentimentFor(article, tickerSlug)
    const rating = toRating(sentiment?.attributes?.type)
    if (!rating) {
      unratedArticles.push({ id: String(article.id), publishedAt })
      lockedArticleCount += document.hasLockedSentiment(article) ? 1 : 0
      continue
    }

    calls.push({
      externalId: String(article.id),
      ticker: ticker.toUpperCase(),
      rating,
      publishedAt,
      title: document.title(article),
      url: document.url(article),
      author: document.author(article),
      raw: { sentiment: sentiment?.attributes ?? null },
    })
  }

  return {
    articleCount: articles.length,
    oldestPublishedAt,
    hasRatingData: document.hasRatingData(),
    calls,
    unratedArticles,
    lockedArticleCount,
  }
}

function isAbout(
  document: SeekingAlphaDocument,
  article: JsonApiResource,
  tickerSlug: string,
): boolean {
  const slugs = document.primaryTickerSlugs(article)
  return slugs === null || slugs.includes(tickerSlug)
}

function older(current: Date | null, candidate: Date): Date {
  if (!current || candidate < current) {
    return candidate
  }
  return current
}
