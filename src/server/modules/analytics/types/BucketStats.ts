import type { Rating } from '../../calls/enums/Rating'
import type { Horizon } from '../../outcomes/enums/Horizon'

/**
 * How one rating did over one horizon. Rates are fractions of the sample;
 * the target and stop fields are null for holds, which have no direction.
 */
export interface BucketStats {
  rating: Rating
  horizon: Horizon
  sampleSize: number
  hitRate: number | null
  meanReturn: number | null
  meanExcess: number | null
  medianExcess: number | null
  // Middle half of stock returns: 25th and 75th percentile.
  lowReturn: number | null
  highReturn: number | null
  medianRunup: number | null
  medianDrawdown: number | null
  targetRate: number | null
  stopRate: number | null
  // Reached the target before (or without) touching the stop.
  targetFirstRate: number | null
  medianDaysToTarget: number | null
}
