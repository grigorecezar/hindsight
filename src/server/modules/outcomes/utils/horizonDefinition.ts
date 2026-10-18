import { HORIZONS } from '../constants/HORIZONS'
import type { Horizon } from '../enums/Horizon'
import type { HorizonDefinition } from '../types/HorizonDefinition'

export function horizonDefinition(horizon: Horizon): HorizonDefinition {
  return HORIZONS.find((definition) => definition.horizon === horizon)!
}
