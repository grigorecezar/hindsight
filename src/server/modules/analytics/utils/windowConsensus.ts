import { addMonths } from '@/server/common/utils/addMonths'
import { mean } from '@/server/common/utils/mean'
import type { Rating } from '../../calls/enums/Rating'
import type { CallRecord } from '../../calls/types/CallRecord'
import { ratingFromScore } from '../../calls/utils/ratingFromScore'
import { ratingScore } from '../../calls/utils/ratingScore'
import type { WindowConsensus } from '../types/WindowConsensus'

/**
 * The consensus over the last `months` before `asOf`: each author's latest
 * call in the window, every author counted once, averaged with Strong Sell
 * as -2 up to Strong Buy as +2.
 */
export function windowConsensus(
  calls: readonly CallRecord[],
  asOf: string,
  months: number,
): WindowConsensus {
  const since = addMonths(asOf, -months)

  // Each author's latest call in the window (an unknown author is their own).
  const latest = new Map<string, CallRecord>()
  for (const call of calls) {
    const isInside = call.publishedOn > since && call.publishedOn <= asOf
    const key = call.authorId ?? `call:${call.id}`
    const current = latest.get(key)
    if (isInside && (!current || call.publishedAt > current.publishedAt)) {
      latest.set(key, call)
    }
  }

  const views = [...latest.values()].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  )
  const score = mean(views.map((call) => ratingScore(call.rating)))
  const mix: Partial<Record<Rating, number>> = {}
  for (const call of views) {
    mix[call.rating] = (mix[call.rating] ?? 0) + 1
  }

  return {
    months,
    since,
    score,
    rating: score === null ? null : ratingFromScore(score),
    authorCount: views.length,
    mix,
    views: views.map((call) => ({
      callId: call.id,
      authorName: call.authorName,
      authorSlug: call.authorSlug,
      rating: call.rating,
      publishedAt: call.publishedAt,
    })),
  }
}
