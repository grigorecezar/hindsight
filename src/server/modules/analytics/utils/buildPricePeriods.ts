import { mean } from '@/server/common/utils/mean'
import type { Rating } from '../../calls/enums/Rating'
import type { CallRecord } from '../../calls/types/CallRecord'
import { ratingFromScore } from '../../calls/utils/ratingFromScore'
import { ratingScore } from '../../calls/utils/ratingScore'
import type { PriceSeries } from '../../prices/utils/PriceSeries'
import type { PeriodConsensus } from '../types/PeriodConsensus'
import type { PeriodHistory } from '../types/PeriodHistory'
import type { PeriodShape } from '../types/PeriodShape'
import type { PeriodVerdict } from '../types/PeriodVerdict'
import type { PricePeriod } from '../types/PricePeriod'
import type { PriceSegment } from '../types/PriceSegment'
import { flatBand, segmentPrices } from './segmentPrices'

type Draft = Omit<PricePeriod, 'next' | 'verdict'>

/**
 * A stock's history as periods, from `fromIndex` on: flat stretches and the
 * moves between them, each with what authors said during it (calls are
 * placed by the day they could first be traded) and what came next.
 */
export function buildPricePeriods(
  series: PriceSeries,
  benchmark: PriceSeries | undefined,
  calls: readonly CallRecord[],
  fromIndex: number,
): PeriodHistory {
  const adjusted = Array.from(
    { length: series.length - fromIndex },
    (_, offset) => series.adjustedAt(fromIndex + offset),
  )
  if (adjusted.length < 2) {
    return { band: 0, periods: [] }
  }

  const band = flatBand(adjusted)
  const segments = segmentPrices(adjusted, band)
  const drafts = segments.map((segment, position) =>
    draft(
      series,
      benchmark,
      calls,
      band,
      {
        ...segment,
        startIndex: segment.startIndex + fromIndex,
        endIndex: segment.endIndex + fromIndex,
      },
      position === 0,
      position === segments.length - 1,
    ),
  )

  const periods = drafts.map((period, position) => {
    const following = drafts[position + 1]
    const next = following
      ? {
          shape: following.shape,
          change: following.change,
          benchmarkChange: following.benchmarkChange,
          excess: following.change - (following.benchmarkChange ?? 0),
          tradingDays: following.tradingDays,
          endDate: following.endDate,
        }
      : null
    return {
      ...period,
      next,
      verdict: verdictFor(period.consensus, next?.excess ?? null, band),
    }
  })
  return { band, periods }
}

function draft(
  series: PriceSeries,
  benchmark: PriceSeries | undefined,
  calls: readonly CallRecord[],
  band: number,
  segment: PriceSegment,
  isFirst: boolean,
  isLast: boolean,
): Draft {
  const { startIndex, endIndex } = segment
  const startDate = series.dateAt(startIndex)
  const endDate = series.dateAt(endIndex)
  const closes = Array.from(
    { length: endIndex - startIndex + 1 },
    (_, offset) => series.closeAt(startIndex + offset),
  )
  const change = series.adjustedAt(endIndex) / series.adjustedAt(startIndex) - 1
  const low = Math.min(...closes)
  const high = Math.max(...closes)

  // Periods share their boundary day, so a call belongs to the period that
  // ends on or after its entry (the first period also takes its start day).
  const inside = calls.filter((call) => {
    const date = call.entryDate ?? call.publishedOn
    const isAfterStart = isFirst ? date >= startDate : date > startDate
    return isAfterStart && (isLast || date <= endDate)
  })

  return {
    shape:
      segment.kind === 'flat'
        ? 'flat'
        : moveShape(change, high / low - 1, band),
    startDate,
    endDate,
    tradingDays: endIndex - startIndex + 1,
    startPrice: series.closeAt(startIndex),
    endPrice: series.closeAt(endIndex),
    low,
    high,
    level: segment.kind === 'flat' ? (mean(closes) ?? null) : null,
    change,
    benchmarkChange: benchmarkChange(benchmark, startDate, endDate),
    isCurrent: isLast,
    consensus: consensusOf(inside),
    callIds: inside.map((call) => call.id),
  }
}

/** A move that swung much wider than where it ended up is choppy. */
function moveShape(change: number, range: number, band: number): PeriodShape {
  const isChoppy = Math.abs(change) < band && range > 2 * Math.abs(change)
  if (isChoppy) {
    return 'choppy'
  }
  return change >= 0 ? 'up' : 'down'
}

function benchmarkChange(
  benchmark: PriceSeries | undefined,
  startDate: string,
  endDate: string,
): number | null {
  if (!benchmark) {
    return null
  }
  const start = benchmark.indexOnOrAfter(startDate)
  const end = benchmark.indexOnOrBefore(endDate)
  if (start === -1 || end === -1 || end < start) {
    return null
  }
  return benchmark.adjustedAt(end) / benchmark.adjustedAt(start) - 1
}

function consensusOf(calls: readonly CallRecord[]): PeriodConsensus | null {
  if (calls.length === 0) {
    return null
  }
  const score = mean(calls.map((call) => ratingScore(call.rating))) ?? 0
  const mix: Partial<Record<Rating, number>> = {}
  for (const call of calls) {
    mix[call.rating] = (mix[call.rating] ?? 0) + 1
  }
  return {
    score,
    rating: ratingFromScore(score),
    callCount: calls.length,
    authorCount: new Set(calls.map((call) => call.authorId ?? call.id)).size,
    mix,
  }
}

/**
 * Bullish authors (an average of Buy or better) were right if the stock
 * then beat the S&P, bearish ones if it lagged, and a Hold average if it
 * stayed within a band of the S&P.
 */
function verdictFor(
  consensus: PeriodConsensus | null,
  excess: number | null,
  band: number,
): PeriodVerdict | null {
  if (!consensus) {
    return null
  }
  if (excess === null) {
    return 'pending'
  }
  const direction =
    consensus.score >= 0.5 ? 1 : consensus.score <= -0.5 ? -1 : 0
  if (direction === 0) {
    return Math.abs(excess) <= band ? 'right' : 'wrong'
  }
  return direction * excess > 0 ? 'right' : 'wrong'
}
