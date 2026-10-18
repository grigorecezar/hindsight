import type { BucketStats } from './BucketStats'
import type { HorizonCorrelation } from './HorizonCorrelation'

export interface AccuracyReport {
  callCount: number
  scoredCallCount: number
  grid: BucketStats[]
  correlations: HorizonCorrelation[]
}
