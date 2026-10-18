import type { RunProblem } from './RunProblem'

/** Counters a run keeps as it goes. Stored as JSON on the run. */
export interface RunStats {
  companyCount: number
  callsFetched: number
  callsSaved: number
  unratedSkipped: number
  sourceRequests: number
  // RapidAPI's remaining monthly quota, from the last response's headers.
  quotaRemaining: number | null
  pricesSaved: number
  outcomesSaved: number
  snapshotsSaved: number
  problems: RunProblem[]
}
