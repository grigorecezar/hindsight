import { describe, expect, it } from 'vitest'
import type { SyncState } from '@/server/modules/calls/types/SyncState'
import { syncWindows } from '@/server/modules/calls/utils/syncWindows'

const NOW = new Date('2026-10-18T12:00:00Z')
const DAY = 86_400_000

function state(overrides: Partial<SyncState>): SyncState {
  return {
    source: 'SEEKING_ALPHA',
    companyId: 'company-1',
    backfilledAt: null,
    coveredFrom: null,
    lastSyncedAt: null,
    latestPublishedAt: null,
    ...overrides,
  }
}

describe('syncWindows', () => {
  it('reads the whole history the first time', () => {
    expect(syncWindows(null, 183, NOW)).toEqual([
      {
        since: new Date(NOW.getTime() - 183 * DAY),
        until: null,
        isBackfill: true,
      },
    ])
  })

  it('then reads only from the newest call, less two weeks', () => {
    const latest = new Date('2026-10-10T15:00:00Z')
    const windows = syncWindows(
      state({
        coveredFrom: new Date(NOW.getTime() - 183 * DAY),
        latestPublishedAt: latest,
      }),
      183,
      NOW,
    )
    expect(windows).toEqual([
      {
        since: new Date(latest.getTime() - 14 * DAY),
        until: null,
        isBackfill: false,
      },
    ])
  })

  it('adds the missing older stretch when the history setting grows', () => {
    const coveredFrom = new Date(NOW.getTime() - 183 * DAY)
    const windows = syncWindows(
      state({
        coveredFrom,
        latestPublishedAt: new Date('2026-10-10T15:00:00Z'),
      }),
      1095,
      NOW,
    )
    expect(windows).toHaveLength(2)
    expect(windows[1]).toEqual({
      since: new Date(NOW.getTime() - 1095 * DAY),
      until: coveredFrom,
      isBackfill: true,
    })
  })
})
