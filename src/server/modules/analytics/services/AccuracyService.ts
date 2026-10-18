import { CallsService } from '../../calls/services/CallsService'
import { OutcomesService } from '../../outcomes/services/OutcomesService'
import type { AccuracyReport } from '../types/AccuracyReport'
import type { AuthorTrackRecord } from '../types/AuthorTrackRecord'
import { buildRatingGrid } from '../utils/buildRatingGrid'
import { correlateRatings } from '../utils/correlateRatings'
import { TrackRecordModel } from '../utils/TrackRecordModel'

/** How well calls predicted what happened, by rating and by author. */
export class AccuracyService {
  constructor(
    private readonly callsService: CallsService,
    private readonly outcomesService: OutcomesService,
  ) {}

  /** The rating by horizon grid, for every company or for one. */
  public async report(companyId?: string): Promise<AccuracyReport> {
    const [callRecords, outcomeRecords] = await Promise.all([
      this.callsService.listRecords(companyId),
      this.outcomesService.listRecords(),
    ])
    const outcomes = companyId
      ? outcomeRecords.filter((outcome) => outcome.companyId === companyId)
      : outcomeRecords

    return {
      callCount: callRecords.length,
      scoredCallCount: new Set(outcomes.map((outcome) => outcome.callId)).size,
      grid: buildRatingGrid(outcomes),
      correlations: correlateRatings(outcomes),
    }
  }

  /** Every author, most skilled first. */
  public async trackRecords(): Promise<AuthorTrackRecord[]> {
    const [callRecords, outcomeRecords] = await Promise.all([
      this.callsService.listRecords(),
      this.outcomesService.listRecords(),
    ])
    return [
      ...TrackRecordModel.build(callRecords, outcomeRecords).values(),
    ].sort((a, b) => b.skill - a.skill || b.scoredCount - a.scoredCount)
  }
}
