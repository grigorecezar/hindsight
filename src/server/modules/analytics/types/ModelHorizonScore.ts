import type { Horizon } from '../../outcomes/enums/Horizon'

/** How past consensus snapshots did over one horizon. */
export interface ModelHorizonScore {
  horizon: Horizon
  sampleSize: number
  hitRate: number | null
  correlation: number | null
  // Average excess return after a buy or strong buy consensus.
  bullishExcess: number | null
  bearishExcess: number | null
  holdExcess: number | null
}
