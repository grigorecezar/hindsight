import { Horizon } from '../enums/Horizon'
import type { HorizonDefinition } from '../types/HorizonDefinition'

/** Every horizon we score, shortest first. */
export const HORIZONS: readonly HorizonDefinition[] = [
  { horizon: Horizon.ONE_MONTH, months: 1, label: '1 month', shortLabel: '1M' },
  {
    horizon: Horizon.TWO_MONTHS,
    months: 2,
    label: '2 months',
    shortLabel: '2M',
  },
  {
    horizon: Horizon.THREE_MONTHS,
    months: 3,
    label: '3 months',
    shortLabel: '3M',
  },
  {
    horizon: Horizon.SIX_MONTHS,
    months: 6,
    label: '6 months',
    shortLabel: '6M',
  },
  {
    horizon: Horizon.TWELVE_MONTHS,
    months: 12,
    label: '12 months',
    shortLabel: '12M',
  },
]
