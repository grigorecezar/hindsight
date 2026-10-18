import { RATINGS_BULLISH_FIRST } from '../../calls/constants/RATINGS_BULLISH_FIRST'
import { HORIZONS } from '../../outcomes/constants/HORIZONS'
import type { OutcomeRecord } from '../../outcomes/types/OutcomeRecord'
import type { BucketStats } from '../types/BucketStats'
import { summarizeBucket } from './summarizeBucket'

/** Every rating by every horizon, empty buckets included. */
export function buildRatingGrid(
  outcomes: readonly OutcomeRecord[],
): BucketStats[] {
  const buckets = Map.groupBy(
    outcomes,
    (outcome) => `${outcome.rating}:${outcome.horizon}`,
  )
  return RATINGS_BULLISH_FIRST.flatMap((rating) =>
    HORIZONS.map(({ horizon }) =>
      summarizeBucket(
        rating,
        horizon,
        buckets.get(`${rating}:${horizon}`) ?? [],
      ),
    ),
  )
}
