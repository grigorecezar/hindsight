import { addDays } from '@/server/common/utils/addDays'
import { daysBetween } from '@/server/common/utils/daysBetween'
import type { CallRecord } from '../../calls/types/CallRecord'
import { ratingFromScore } from '../../calls/utils/ratingFromScore'
import { ratingScore } from '../../calls/utils/ratingScore'
import { HORIZONS } from '../../outcomes/constants/HORIZONS'
import type { Horizon } from '../../outcomes/enums/Horizon'
import type { Consensus } from '../types/Consensus'
import type { ConsensusInput } from '../types/ConsensusInput'
import type { ExpectedByHorizon } from '../types/ExpectedByHorizon'
import type { ExpectedOutcome } from '../types/ExpectedOutcome'
import type { OutcomePriors } from './OutcomePriors'

interface WeightedCall {
  call: CallRecord
  recencyWeight: number
  authorWeight: number
  weight: number
}

/**
 * The blended view on one company. Takes each author's latest call from the
 * last LOOKBACK_DAYS, weights it by how recent it is and by the author's
 * track record, and averages the ratings. The expected returns come from
 * what calls of each rating went on to do in the past, blended the same way.
 */
export class ConsensusModel {
  public static readonly LOOKBACK_DAYS = 180
  // A call's weight halves every HALF_LIFE_DAYS.
  private static readonly HALF_LIFE_DAYS = 60

  public static compute(input: ConsensusInput): Consensus | null {
    const live = ConsensusModel.latestPerAuthor(input)
    if (live.length === 0) {
      return null
    }

    const weighted = live.map((call) => ConsensusModel.weigh(call, input))
    const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
    const sumOfSquares = weighted.reduce(
      (sum, item) => sum + item.weight ** 2,
      0,
    )
    const score =
      weighted.reduce(
        (sum, item) => sum + item.weight * ratingScore(item.call.rating),
        0,
      ) / totalWeight

    return {
      asOf: input.asOf,
      score,
      rating: ratingFromScore(score),
      callCount: live.length,
      authorCount: new Set(live.map((call) => call.authorId).filter(Boolean))
        .size,
      effectiveCallCount: totalWeight ** 2 / sumOfSquares,
      price: input.price,
      expected: ConsensusModel.expected(weighted, totalWeight, input.priors),
      contributions: weighted
        .map((item) => ({
          callId: item.call.id,
          authorId: item.call.authorId,
          authorName: item.call.authorName,
          authorSlug: item.call.authorSlug,
          rating: item.call.rating,
          publishedAt: item.call.publishedAt,
          title: item.call.title,
          url: item.call.url,
          recencyWeight: item.recencyWeight,
          authorWeight: item.authorWeight,
          share: item.weight / totalWeight,
        }))
        .sort((a, b) => b.share - a.share),
    }
  }

  /** Each author's most recent call inside the window. */
  private static latestPerAuthor(input: ConsensusInput): CallRecord[] {
    const windowStart = addDays(input.asOf, -ConsensusModel.LOOKBACK_DAYS)
    const latest = new Map<string, CallRecord>()

    for (const call of input.calls) {
      const date = call.publishedOn
      const key = call.authorId ?? `call:${call.id}`
      const current = latest.get(key)
      const isCandidate = date <= input.asOf && date > windowStart
      const isNewer = !current || call.publishedAt > current.publishedAt
      if (isCandidate && isNewer) {
        latest.set(key, call)
      }
    }
    return [...latest.values()]
  }

  private static weigh(call: CallRecord, input: ConsensusInput): WeightedCall {
    const ageDays = daysBetween(call.publishedOn, input.asOf)
    const recencyWeight = 0.5 ** (ageDays / ConsensusModel.HALF_LIFE_DAYS)
    const authorWeight = call.authorId
      ? (input.trackRecords.get(call.authorId)?.weight ?? 1)
      : 1
    return {
      call,
      recencyWeight,
      authorWeight,
      weight: recencyWeight * authorWeight,
    }
  }

  private static expected(
    weighted: WeightedCall[],
    totalWeight: number,
    priors: OutcomePriors,
  ): ExpectedByHorizon {
    return Object.fromEntries(
      HORIZONS.map(({ horizon }) => [
        horizon,
        ConsensusModel.blend(weighted, totalWeight, priors, horizon),
      ]),
    )
  }

  private static blend(
    weighted: WeightedCall[],
    totalWeight: number,
    priors: OutcomePriors,
    horizon: Horizon,
  ): ExpectedOutcome {
    const parts = weighted.map((item) => ({
      share: item.weight / totalWeight,
      prior: priors.expectedFor(item.call.rating, horizon),
    }))
    const blendOf = (pick: (prior: ExpectedOutcome) => number) =>
      parts.reduce((sum, part) => sum + part.share * pick(part.prior), 0)
    const hasRange = parts.every(
      (part) => part.prior.low !== null && part.prior.high !== null,
    )
    const ratings = new Map(
      weighted.map((item) => [
        item.call.rating,
        priors.expectedFor(item.call.rating, horizon).sampleSize,
      ]),
    )

    return {
      stockReturn: blendOf((prior) => prior.stockReturn),
      excessReturn: blendOf((prior) => prior.excessReturn),
      low: hasRange ? blendOf((prior) => prior.low!) : null,
      high: hasRange ? blendOf((prior) => prior.high!) : null,
      sampleSize: [...ratings.values()].reduce((sum, size) => sum + size, 0),
    }
  }
}
