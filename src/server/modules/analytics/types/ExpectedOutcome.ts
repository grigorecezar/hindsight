/**
 * What the consensus implies for one horizon, from how calls like these did
 * in the past. Internal and stored as JSON on a snapshot.
 */
export interface ExpectedOutcome {
  stockReturn: number
  excessReturn: number
  // Middle half of past outcomes (25th to 75th percentile), when known.
  low: number | null
  high: number | null
  // Matured outcomes behind the estimate.
  sampleSize: number
}
