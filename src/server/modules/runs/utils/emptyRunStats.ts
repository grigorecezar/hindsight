import type { RunStats } from '../types/RunStats'

export function emptyRunStats(): RunStats {
  return {
    companyCount: 0,
    callsFetched: 0,
    callsSaved: 0,
    unratedSkipped: 0,
    sourceRequests: 0,
    quotaRemaining: null,
    pricesSaved: 0,
    outcomesSaved: 0,
    snapshotsSaved: 0,
    problems: [],
  }
}
