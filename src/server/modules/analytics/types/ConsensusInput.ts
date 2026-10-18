import type { CallRecord } from '../../calls/types/CallRecord'
import type { OutcomePriors } from '../utils/OutcomePriors'
import type { AuthorTrackRecord } from './AuthorTrackRecord'

export interface ConsensusInput {
  asOf: string
  // One company's calls. Calls after `asOf` are ignored.
  calls: readonly CallRecord[]
  trackRecords: Map<string, AuthorTrackRecord>
  priors: OutcomePriors
  price: number | null
}
