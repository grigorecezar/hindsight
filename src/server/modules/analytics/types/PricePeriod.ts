import type { PeriodConsensus } from './PeriodConsensus'
import type { PeriodNext } from './PeriodNext'
import type { PeriodShape } from './PeriodShape'
import type { PeriodVerdict } from './PeriodVerdict'

/**
 * One stretch of a stock's price history (flat, or a move between flat
 * stretches), what authors said during it, and what the stock did next.
 */
export interface PricePeriod {
  shape: PeriodShape
  startDate: string
  endDate: string
  tradingDays: number
  startPrice: number
  endPrice: number
  low: number
  high: number
  // The average close of a flat period, drawn as its horizontal line.
  level: number | null
  change: number
  benchmarkChange: number | null
  isCurrent: boolean
  consensus: PeriodConsensus | null
  next: PeriodNext | null
  verdict: PeriodVerdict | null
  callIds: string[]
}
