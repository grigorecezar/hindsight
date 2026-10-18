import type { SyncProgress } from '../types/SyncProgress'
import type { SyncWindow } from '../types/SyncWindow'

const DAY_MS = 86_400_000
// Re-read this far before the newest call, to catch late or edited calls.
const OVERLAP_DAYS = 14

/**
 * What to read next for one company or author. Never synced: the whole
 * history.
 * Otherwise: from the newest call (less the overlap) to now, plus the older
 * stretch still missing if `historyDays` has grown since the last backfill.
 */
export function syncWindows(
  state: SyncProgress | null,
  historyDays: number,
  now: Date = new Date(),
): SyncWindow[] {
  const historyStart = new Date(now.getTime() - historyDays * DAY_MS)
  if (!state?.coveredFrom) {
    return [{ since: historyStart, until: null, isBackfill: true }]
  }

  const anchor = state.latestPublishedAt ?? state.lastSyncedAt ?? now
  const forward: SyncWindow = {
    since: new Date(anchor.getTime() - OVERLAP_DAYS * DAY_MS),
    until: null,
    isBackfill: false,
  }

  // A day of slack so a history that is complete is not re-read daily.
  const isMissingHistory =
    state.coveredFrom.getTime() - historyStart.getTime() > DAY_MS
  if (!isMissingHistory) {
    return [forward]
  }
  return [
    forward,
    { since: historyStart, until: state.coveredFrom, isBackfill: true },
  ]
}
