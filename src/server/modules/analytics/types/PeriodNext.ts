import type { PeriodShape } from './PeriodShape'

/** What the stock did in the period after this one. */
export interface PeriodNext {
  shape: PeriodShape
  change: number
  benchmarkChange: number | null
  // The stock's change less the benchmark's, or the change when unknown.
  excess: number
  tradingDays: number
  endDate: string
}
