import type { Rating } from '../../calls/enums/Rating'
import type { Horizon } from '../enums/Horizon'

/** A stored outcome joined with its call. Internal only. */
export interface OutcomeRecord {
  callId: string
  source: string
  companyId: string
  ticker: string
  authorId: string | null
  rating: Rating
  publishedAt: Date
  entryDate: string
  horizon: Horizon
  exitDate: string
  stockReturn: number
  benchmarkReturn: number
  excessReturn: number
  maxRunup: number
  maxDrawdown: number
  targetHitOn: string | null
  stopHitOn: string | null
  isHit: boolean
}
