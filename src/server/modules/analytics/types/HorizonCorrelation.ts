import type { Horizon } from '../../outcomes/enums/Horizon'

/**
 * Rank correlation between rating and excess return over one horizon.
 * Above zero means stronger ratings were followed by better returns.
 */
export interface HorizonCorrelation {
  horizon: Horizon
  sampleSize: number
  value: number | null
}
