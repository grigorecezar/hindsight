import { daysBetween } from '@/server/common/utils/daysBetween'
import { mean } from '@/server/common/utils/mean'
import { median } from '@/server/common/utils/median'
import { quantile } from '@/server/common/utils/quantile'
import type { Rating } from '../../calls/enums/Rating'
import { ratingDirection } from '../../calls/utils/ratingDirection'
import type { Horizon } from '../../outcomes/enums/Horizon'
import type { OutcomeRecord } from '../../outcomes/types/OutcomeRecord'
import type { BucketStats } from '../types/BucketStats'

/** Summary of how calls with one rating did over one horizon. */
export function summarizeBucket(
  rating: Rating,
  horizon: Horizon,
  outcomes: readonly OutcomeRecord[],
): BucketStats {
  const sampleSize = outcomes.length
  const hasDirection = ratingDirection(rating) !== 0
  const stockReturns = outcomes.map((outcome) => outcome.stockReturn)
  const excessReturns = outcomes.map((outcome) => outcome.excessReturn)
  const share = (count: number) => (sampleSize > 0 ? count / sampleSize : null)
  const directionalShare = (count: number) =>
    hasDirection ? share(count) : null

  const targetHits = outcomes.filter((outcome) => outcome.targetHitOn)
  const targetFirst = targetHits.filter(
    (outcome) =>
      !outcome.stopHitOn || outcome.targetHitOn! <= outcome.stopHitOn,
  )

  return {
    rating,
    horizon,
    sampleSize,
    hitRate: share(outcomes.filter((outcome) => outcome.isHit).length),
    meanReturn: mean(stockReturns),
    meanExcess: mean(excessReturns),
    medianExcess: median(excessReturns),
    lowReturn: quantile(stockReturns, 0.25),
    highReturn: quantile(stockReturns, 0.75),
    medianRunup: median(outcomes.map((outcome) => outcome.maxRunup)),
    medianDrawdown: median(outcomes.map((outcome) => outcome.maxDrawdown)),
    targetRate: directionalShare(targetHits.length),
    stopRate: directionalShare(
      outcomes.filter((outcome) => outcome.stopHitOn).length,
    ),
    targetFirstRate: directionalShare(targetFirst.length),
    medianDaysToTarget: median(
      targetHits.map((outcome) =>
        daysBetween(outcome.entryDate, outcome.targetHitOn!),
      ),
    ),
  }
}
