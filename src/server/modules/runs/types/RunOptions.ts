import type { RunTrigger } from '../enums/RunTrigger'
import type { RunStats } from './RunStats'

export interface RunOptions {
  trigger: RunTrigger
  // Limit the source sync to these companies. Scores are always rebuilt
  // for everyone.
  companyIds?: string[]
  // Counts from calls that were synced before the run (the extension).
  syncStats?: Partial<RunStats>
}
