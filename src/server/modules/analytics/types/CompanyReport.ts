import type { Company } from '../../companies/types/Company'
import type { AccuracyReport } from './AccuracyReport'
import type { AuthorTrackRecord } from './AuthorTrackRecord'
import type { CallRow } from './CallRow'
import type { ChartMarker } from './ChartMarker'
import type { ChartPoint } from './ChartPoint'
import type { PeriodHistory } from './PeriodHistory'
import type { SnapshotRecord } from './SnapshotRecord'
import type { WindowConsensus } from './WindowConsensus'

/** Everything the company page shows. */
export interface CompanyReport {
  company: Company
  // What authors think over the last 1, 3, 6 and 12 months.
  windows: WindowConsensus[]
  accuracy: AccuracyReport
  calls: CallRow[]
  chartPoints: ChartPoint[]
  chartMarkers: ChartMarker[]
  periods: PeriodHistory
  authors: AuthorTrackRecord[]
  snapshots: SnapshotRecord[]
  benchmarkTicker: string
}
