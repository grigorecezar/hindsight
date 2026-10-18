import { ratingScore } from '../../calls/utils/ratingScore'
import { HORIZONS } from '../../outcomes/constants/HORIZONS'
import type { OutcomeRecord } from '../../outcomes/types/OutcomeRecord'
import type { HorizonCorrelation } from '../types/HorizonCorrelation'
import { spearman } from './spearman'

/** Per horizon, whether stronger ratings were followed by better returns. */
export function correlateRatings(
  outcomes: readonly OutcomeRecord[],
): HorizonCorrelation[] {
  return HORIZONS.map(({ horizon }) => {
    const matching = outcomes.filter((outcome) => outcome.horizon === horizon)
    return {
      horizon,
      sampleSize: matching.length,
      value: spearman(
        matching.map((outcome) => ratingScore(outcome.rating)),
        matching.map((outcome) => outcome.excessReturn),
      ),
    }
  })
}
