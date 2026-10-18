/** The measured part of an outcome. Internal only. */
export interface OutcomeValues {
  exitDate: string
  exitPrice: number
  stockReturn: number
  benchmarkReturn: number
  excessReturn: number
  maxRunup: number
  maxDrawdown: number
  targetHitOn: string | null
  stopHitOn: string | null
  isHit: boolean
}
