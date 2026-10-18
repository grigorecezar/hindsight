/**
 * A stretch of a price series: flat (the price held inside a band) or a
 * move between two flat stretches. Indexes point into the series.
 */
export interface PriceSegment {
  kind: 'flat' | 'move'
  startIndex: number
  endIndex: number
}
