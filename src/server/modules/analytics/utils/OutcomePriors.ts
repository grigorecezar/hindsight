import { mean } from '@/server/common/utils/mean'
import { quantile } from '@/server/common/utils/quantile'
import type { Rating } from '../../calls/enums/Rating'
import type { Horizon } from '../../outcomes/enums/Horizon'
import type { OutcomeRecord } from '../../outcomes/types/OutcomeRecord'
import type { ExpectedOutcome } from '../types/ExpectedOutcome'

interface BucketSummary {
  sampleSize: number
  meanReturn: number
  meanExcess: number
  low: number | null
  high: number | null
}

/**
 * What calls of each rating went on to do, per horizon, as a lookup for the
 * consensus. Averages are pulled toward the market as if each bucket held
 * PRIOR_CALLS extra calls that did exactly what the market did, so a thin
 * bucket says "about the market" instead of repeating two lucky calls.
 */
export class OutcomePriors {
  private static readonly PRIOR_CALLS = 20
  // The 25th to 75th percentile range is shown only with this many outcomes.
  private static readonly MIN_RANGE_SAMPLE = 10

  private constructor(
    private readonly buckets: Map<string, BucketSummary>,
    private readonly benchmarkMeans: Map<Horizon, number>,
  ) {}

  /** Priors from outcomes matured by `asOf`, or all of them when null. */
  public static fromOutcomes(
    outcomes: readonly OutcomeRecord[],
    asOf: string | null = null,
  ): OutcomePriors {
    const known = asOf
      ? outcomes.filter((outcome) => outcome.exitDate <= asOf)
      : outcomes

    const benchmarkMeans = new Map<Horizon, number>()
    for (const [horizon, group] of Map.groupBy(known, (o) => o.horizon)) {
      benchmarkMeans.set(
        horizon,
        mean(group.map((o) => o.benchmarkReturn)) ?? 0,
      )
    }

    const buckets = new Map<string, BucketSummary>()
    const groups = Map.groupBy(known, (o) =>
      OutcomePriors.key(o.rating, o.horizon),
    )
    for (const [key, group] of groups) {
      buckets.set(key, OutcomePriors.summarize(group))
    }
    return new OutcomePriors(buckets, benchmarkMeans)
  }

  private static summarize(outcomes: OutcomeRecord[]): BucketSummary {
    const stockReturns = outcomes.map((outcome) => outcome.stockReturn)
    const hasRange = outcomes.length >= OutcomePriors.MIN_RANGE_SAMPLE
    return {
      sampleSize: outcomes.length,
      meanReturn: mean(stockReturns) ?? 0,
      meanExcess: mean(outcomes.map((outcome) => outcome.excessReturn)) ?? 0,
      low: hasRange ? quantile(stockReturns, 0.25) : null,
      high: hasRange ? quantile(stockReturns, 0.75) : null,
    }
  }

  private static key(rating: Rating, horizon: Horizon): string {
    return `${rating}:${horizon}`
  }

  public expectedFor(rating: Rating, horizon: Horizon): ExpectedOutcome {
    const bucket = this.buckets.get(OutcomePriors.key(rating, horizon))
    const marketReturn = this.benchmarkMeans.get(horizon) ?? 0
    const sampleSize = bucket?.sampleSize ?? 0
    const total = sampleSize + OutcomePriors.PRIOR_CALLS

    return {
      stockReturn:
        (sampleSize * (bucket?.meanReturn ?? 0) +
          OutcomePriors.PRIOR_CALLS * marketReturn) /
        total,
      excessReturn: (sampleSize * (bucket?.meanExcess ?? 0)) / total,
      low: bucket?.low ?? null,
      high: bucket?.high ?? null,
      sampleSize,
    }
  }
}
