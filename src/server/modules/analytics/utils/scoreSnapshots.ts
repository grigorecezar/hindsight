import { mean } from '@/server/common/utils/mean'
import { ratingDirection } from '../../calls/utils/ratingDirection'
import { HORIZONS } from '../../outcomes/constants/HORIZONS'
import type { OutcomeValues } from '../../outcomes/types/OutcomeValues'
import type { PriceSeries } from '../../prices/utils/PriceSeries'
import type { ModelHorizonScore } from '../types/ModelHorizonScore'
import type { SnapshotRecord } from '../types/SnapshotRecord'
import { scoreSnapshot } from './scoreSnapshot'
import { spearman } from './spearman'

interface ScoredSnapshot {
  snapshot: SnapshotRecord
  outcome: OutcomeValues
}

/**
 * Scores past consensus snapshots the way calls are scored, entering at the
 * first close after the snapshot date, so the model gets a track record.
 */
export function scoreSnapshots(
  snapshots: readonly SnapshotRecord[],
  tickerByCompanyId: Map<string, string>,
  seriesByTicker: Map<string, PriceSeries>,
  benchmark: PriceSeries,
  targetMove: number,
): ModelHorizonScore[] {
  return HORIZONS.map(({ horizon, months }) => {
    const scored = snapshots.flatMap((snapshot): ScoredSnapshot[] => {
      const ticker = tickerByCompanyId.get(snapshot.companyId) ?? ''
      const series = seriesByTicker.get(ticker)
      const outcome = series
        ? scoreSnapshot(snapshot, series, benchmark, months, targetMove)
        : null
      return outcome ? [{ snapshot, outcome }] : []
    })

    const excessWhere = (direction: number) =>
      mean(
        scored
          .filter((item) => ratingDirection(item.snapshot.rating) === direction)
          .map((item) => item.outcome.excessReturn),
      )

    return {
      horizon,
      sampleSize: scored.length,
      hitRate:
        scored.length > 0
          ? scored.filter((item) => item.outcome.isHit).length / scored.length
          : null,
      correlation: spearman(
        scored.map((item) => item.snapshot.score),
        scored.map((item) => item.outcome.excessReturn),
      ),
      bullishExcess: excessWhere(1),
      bearishExcess: excessWhere(-1),
      holdExcess: excessWhere(0),
    }
  })
}
