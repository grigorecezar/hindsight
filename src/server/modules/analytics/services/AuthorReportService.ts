import { addDays } from '@/server/common/utils/addDays'
import { todayInNewYork } from '@/server/common/utils/todayInNewYork'
import type { Author } from '../../authors/types/Author'
import { CallsService } from '../../calls/services/CallsService'
import { CallSyncService } from '../../calls/services/CallSyncService'
import { OutcomesService } from '../../outcomes/services/OutcomesService'
import { PricesService } from '../../prices/services/PricesService'
import { SourceId } from '../../sources/enums/SourceId'
import type { AuthorReport } from '../types/AuthorReport'
import type { CallRow } from '../types/CallRow'
import { buildRatingGrid } from '../utils/buildRatingGrid'
import { correlateRatings } from '../utils/correlateRatings'
import { toCallRow } from '../utils/toCallRow'
import { TrackRecordModel } from '../utils/TrackRecordModel'

/** Assembles the author page: what they think now, and how they have done. */
export class AuthorReportService {
  // A view older than this no longer counts as what the author thinks now.
  private static readonly CURRENT_VIEW_DAYS = 365

  constructor(
    private readonly callsService: CallsService,
    private readonly outcomesService: OutcomesService,
    private readonly pricesService: PricesService,
    private readonly callSyncService: CallSyncService,
    private readonly settings: { benchmarkTicker: string },
  ) {}

  public async build(author: Author): Promise<AuthorReport> {
    const [callRecords, outcomeRecords, authorStates] = await Promise.all([
      this.callsService.listRecords(),
      this.outcomesService.listRecords(),
      this.callSyncService.listAuthorStates(),
    ])
    const authorCalls = callRecords.filter(
      (call) => call.authorId === author.id,
    )
    const authorOutcomes = outcomeRecords.filter(
      (outcome) => outcome.authorId === author.id,
    )

    // Every call with its outcomes and its return so far, newest first.
    const { benchmarkTicker } = this.settings
    const seriesByTicker = await this.pricesService.loadSeries([
      ...new Set(authorCalls.map((call) => call.ticker)),
      benchmarkTicker,
    ])
    const outcomesByCall = Map.groupBy(
      authorOutcomes,
      (outcome) => outcome.callId,
    )
    const calls = authorCalls
      .map((call) =>
        toCallRow(
          call,
          outcomesByCall.get(call.id) ?? [],
          seriesByTicker.get(call.ticker),
          seriesByTicker.get(benchmarkTicker),
        ),
      )
      .reverse()

    return {
      author,
      record:
        TrackRecordModel.build(callRecords, outcomeRecords).get(author.id) ??
        null,
      currentViews: this.currentViews(calls),
      accuracy: {
        callCount: authorCalls.length,
        scoredCallCount: new Set(
          authorOutcomes.map((outcome) => outcome.callId),
        ).size,
        grid: buildRatingGrid(authorOutcomes),
        correlations: correlateRatings(authorOutcomes),
      },
      calls,
      isSynced: authorStates.some(
        (state) =>
          state.authorId === author.id &&
          state.source === SourceId.SEEKING_ALPHA &&
          state.coveredFrom,
      ),
      benchmarkTicker,
    }
  }

  /** The latest call per company inside the window, from newest first rows. */
  private currentViews(calls: CallRow[]): CallRow[] {
    const cutoff = addDays(
      todayInNewYork(),
      -AuthorReportService.CURRENT_VIEW_DAYS,
    )
    const latest = new Map<string, CallRow>()
    for (const call of calls) {
      const isRecent = call.publishedAt.toISOString().slice(0, 10) >= cutoff
      if (isRecent && !latest.has(call.companyId)) {
        latest.set(call.companyId, call)
      }
    }
    return [...latest.values()]
  }
}
