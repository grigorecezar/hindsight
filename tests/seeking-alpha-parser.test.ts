import { describe, expect, it } from 'vitest'
import { Rating } from '@/server/modules/calls/enums/Rating'
import { parseAnalysisPage } from '@/server/modules/sources/seeking-alpha/utils/parseAnalysisPage'
import { toRating } from '@/server/modules/sources/seeking-alpha/utils/toRating'
import fixture from './fixtures/seeking-alpha-analysis-list.json'

describe('parseAnalysisPage', () => {
  const page = parseAnalysisPage(fixture, 'AAPL')
  const byId = new Map(page.calls.map((call) => [call.externalId, call]))

  it('reads a rating linked through relationships', () => {
    const call = byId.get('4701001')
    expect(call?.rating).toBe(Rating.BUY)
    expect(call?.author).toEqual({
      externalId: '51234',
      name: 'Quality Compounder',
      url: 'https://seekingalpha.com/author/quality-compounder',
    })
    expect(call?.url).toBe(
      'https://seekingalpha.com/article/4701001-apple-services-carry-the-quarter',
    )
    expect(call?.publishedAt.toISOString()).toBe('2026-09-15T12:30:00.000Z')
  })

  it('reads a rating linked only by article id', () => {
    expect(byId.get('4700500')?.rating).toBe(Rating.STRONG_SELL)
  })

  it('picks the sentiment tagged for the ticker in a multi ticker article', () => {
    expect(byId.get('4700400')?.rating).toBe(Rating.STRONG_BUY)
    const microsoft = parseAnalysisPage(fixture, 'MSFT')
    const preview = microsoft.calls.find(
      (call) => call.externalId === '4700400',
    )
    expect(preview?.rating).toBe(Rating.HOLD)
  })

  it('drops articles where the ticker is only a secondary mention', () => {
    expect(byId.has('4700300')).toBe(false)
  })

  it('counts articles about the ticker that carry no rating', () => {
    expect(page.unratedArticles.map((article) => article.id)).toEqual([
      '4700200',
    ])
  })

  it('reports paging facts', () => {
    expect(page.articleCount).toBe(5)
    expect(page.hasRatingData).toBe(true)
    expect(page.oldestPublishedAt?.toISOString()).toBe(
      '2026-09-01T16:00:00.000Z',
    )
  })

  it('flags a payload with no ratings at all', () => {
    const stripped = {
      data: fixture.data.map(({ relationships, ...article }) => ({
        ...article,
        relationships: { primaryTickers: relationships.primaryTickers },
      })),
      included: fixture.included.filter((item) => item.type !== 'sentiment'),
    }
    const strippedPage = parseAnalysisPage(stripped, 'AAPL')
    expect(strippedPage.hasRatingData).toBe(false)
    expect(strippedPage.calls).toHaveLength(0)
  })

  it('counts ratings that exist but come back hidden', () => {
    // What a logged out request gets: sentiment references, empty sentiments.
    const hidden = {
      ...fixture,
      included: fixture.included.map((item) =>
        item.type === 'sentiment' ? { ...item, attributes: {} } : item,
      ),
    }
    const hiddenPage = parseAnalysisPage(hidden, 'AAPL')
    expect(hiddenPage.calls).toHaveLength(0)
    // Two AAPL articles reference sentiments by relationship; one has none.
    expect(hiddenPage.lockedArticleCount).toBe(2)
    expect(page.lockedArticleCount).toBe(0)
  })
})

describe('toRating', () => {
  it.each([
    ['very_bullish', Rating.STRONG_BUY],
    ['Bullish', Rating.BUY],
    ['neutral', Rating.HOLD],
    ['bearish', Rating.SELL],
    ['very-bearish', Rating.STRONG_SELL],
    ['Strong Buy', Rating.STRONG_BUY],
    ['long', Rating.BUY],
  ])('maps %s', (sentiment, rating) => {
    expect(toRating(sentiment)).toBe(rating)
  })

  it('returns null for anything else', () => {
    expect(toRating('unrated')).toBeNull()
    expect(toRating(undefined)).toBeNull()
  })
})
