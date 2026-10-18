import type { Rating } from '../../calls/enums/Rating'

/** A call drawn on the price chart, at its entry. */
export interface ChartMarker {
  date: string
  price: number
  rating: Rating
  authorName: string | null
  title: string | null
}
