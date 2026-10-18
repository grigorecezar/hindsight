import type { CallRecord } from '../../calls/types/CallRecord'
import type { OutcomeRecord } from '../../outcomes/types/OutcomeRecord'
import type { PriceSeries } from '../../prices/utils/PriceSeries'
import type { CallRow } from '../types/CallRow'

/**
 * A call as the pages list it: its matured outcomes by horizon, and its
 * return from the entry to the latest close against the benchmark.
 */
export function toCallRow(
  call: CallRecord,
  outcomes: readonly OutcomeRecord[],
  series: PriceSeries | undefined,
  benchmark: PriceSeries | undefined,
): CallRow {
  return {
    id: call.id,
    publishedAt: call.publishedAt,
    rating: call.rating,
    companyId: call.companyId,
    ticker: call.ticker,
    companyName: call.companyName,
    authorId: call.authorId,
    authorName: call.authorName,
    authorSlug: call.authorSlug,
    authorUrl: call.authorUrl,
    title: call.title,
    url: call.url,
    entryDate: call.entryDate,
    entryPrice: call.entryPrice,
    sinceEntry: sinceEntry(call, series, benchmark),
    outcomes: Object.fromEntries(
      outcomes.map((outcome) => [
        outcome.horizon,
        {
          stockReturn: outcome.stockReturn,
          excessReturn: outcome.excessReturn,
          isHit: outcome.isHit,
        },
      ]),
    ),
  }
}

function sinceEntry(
  call: CallRecord,
  series: PriceSeries | undefined,
  benchmark: PriceSeries | undefined,
): CallRow['sinceEntry'] {
  if (!call.entryDate || !series || !benchmark) {
    return null
  }
  const entryIndex = series.indexOnOrAfter(call.entryDate)
  const benchmarkIndex = benchmark.indexOnOrAfter(call.entryDate)
  if (entryIndex === -1 || benchmarkIndex === -1) {
    return null
  }

  const stockReturn =
    series.adjustedAt(series.lastIndex) / series.adjustedAt(entryIndex) - 1
  const benchmarkReturn =
    benchmark.adjustedAt(benchmark.lastIndex) /
      benchmark.adjustedAt(benchmarkIndex) -
    1
  return { stockReturn, excessReturn: stockReturn - benchmarkReturn }
}
