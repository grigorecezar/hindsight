import { addDays } from '@/server/common/utils/addDays'
import type { OutcomeValues } from '../../outcomes/types/OutcomeValues'
import { computeOutcome } from '../../outcomes/utils/computeOutcome'
import type { PriceSeries } from '../../prices/utils/PriceSeries'
import type { SnapshotRecord } from '../types/SnapshotRecord'

/**
 * What the stock did over `months` after a consensus snapshot, entering at
 * the first close after the snapshot date, or null while that has not
 * passed. Judged like a call with the consensus rating.
 */
export function scoreSnapshot(
  snapshot: Pick<SnapshotRecord, 'asOf' | 'rating'>,
  series: PriceSeries,
  benchmark: PriceSeries,
  months: number,
  targetMove: number,
): OutcomeValues | null {
  const entryIndex = series.indexOnOrAfter(addDays(snapshot.asOf, 1))
  if (entryIndex === -1) {
    return null
  }
  return computeOutcome({
    rating: snapshot.rating,
    series,
    benchmark,
    entryIndex,
    months,
    targetMove,
  })
}
