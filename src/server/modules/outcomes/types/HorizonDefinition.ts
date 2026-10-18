import type { Horizon } from '../enums/Horizon'

export interface HorizonDefinition {
  horizon: Horizon
  months: number
  label: string
  shortLabel: string
}
