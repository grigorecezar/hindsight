import type { PricePeriod } from './PricePeriod'

export interface PeriodHistory {
  // The band a flat period stays inside, for this stock.
  band: number
  periods: PricePeriod[]
}
