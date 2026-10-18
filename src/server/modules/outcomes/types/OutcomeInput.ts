import type { Rating } from '../../calls/enums/Rating'
import type { PriceSeries } from '../../prices/utils/PriceSeries'

export interface OutcomeInput {
  rating: Rating
  series: PriceSeries
  benchmark: PriceSeries
  // Index of the entry day in `series`.
  entryIndex: number
  months: number
  // Move (as a fraction) that counts as reaching the target or the stop.
  targetMove: number
}
