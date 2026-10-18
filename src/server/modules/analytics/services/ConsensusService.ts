import { asc, desc, eq, sql } from 'drizzle-orm'
import { chunk } from '@/server/common/utils/chunk'
import { todayInNewYork } from '@/server/common/utils/todayInNewYork'
import { consensusSnapshots } from '@/server/db/schema'
import type { Database } from '@/server/db/types/Database'
import { createLogger } from '@/server/logging/createLogger'
import { CallsService } from '../../calls/services/CallsService'
import type { CallRecord } from '../../calls/types/CallRecord'
import { OutcomesService } from '../../outcomes/services/OutcomesService'
import type { OutcomeRecord } from '../../outcomes/types/OutcomeRecord'
import { PricesService } from '../../prices/services/PricesService'
import type { PriceSeries } from '../../prices/utils/PriceSeries'
import type { Consensus } from '../types/Consensus'
import type { ModelHorizonScore } from '../types/ModelHorizonScore'
import type { SnapshotRecord } from '../types/SnapshotRecord'
import { ConsensusModel } from '../utils/ConsensusModel'
import { weekEnds } from '../utils/weekEnds'
import { OutcomePriors } from '../utils/OutcomePriors'
import { scoreSnapshots } from '../utils/scoreSnapshots'
import { TrackRecordModel } from '../utils/TrackRecordModel'

type SnapshotRow = typeof consensusSnapshots.$inferInsert

/** The consensus per company, now and as it stood at the end of every week. */
export class ConsensusService {
  private static readonly INSERT_BATCH_SIZE = 1000

  private readonly logger = createLogger(ConsensusService.name)

  constructor(
    private readonly db: Database,
    private readonly callsService: CallsService,
    private readonly outcomesService: OutcomesService,
    private readonly pricesService: PricesService,
    private readonly settings: { benchmarkTicker: string; targetMove: number },
  ) {}

  /**
   * Recomputes a snapshot for every company at every week end since its
   * first call, plus today. Each one only sees calls published and outcomes
   * matured by its date, so scoring them later is an honest backtest.
   */
  public async rebuildSnapshots(): Promise<number> {
    const [callRecords, outcomeRecords] = await Promise.all([
      this.callsService.listRecords(),
      this.outcomesService.listRecords(),
    ])
    const callsByCompany = Map.groupBy(callRecords, (call) => call.companyId)
    const tickers = [...new Set(callRecords.map((call) => call.ticker))]
    const seriesByTicker = await this.pricesService.loadSeries(tickers)

    const rows = this.snapshotDates(callRecords).flatMap((asOf) =>
      this.snapshotsOn(
        asOf,
        callsByCompany,
        outcomeRecords,
        callRecords,
        seriesByTicker,
      ),
    )
    await this.replace(rows)

    this.logger.info({ count: rows.length }, 'consensus snapshots rebuilt')
    return rows.length
  }

  /** The newest snapshot of each company. */
  public async latestSnapshots(): Promise<Map<string, SnapshotRecord>> {
    const rows = await this.db
      .selectDistinctOn([consensusSnapshots.companyId])
      .from(consensusSnapshots)
      .orderBy(asc(consensusSnapshots.companyId), desc(consensusSnapshots.asOf))
    return new Map(rows.map((row) => [row.companyId, row]))
  }

  public async snapshotsFor(companyId: string): Promise<SnapshotRecord[]> {
    return this.db
      .select()
      .from(consensusSnapshots)
      .where(eq(consensusSnapshots.companyId, companyId))
      .orderBy(asc(consensusSnapshots.asOf))
  }

  /** The model's own track record: how past snapshots went on to do. */
  public async scoreModel(): Promise<ModelHorizonScore[]> {
    const [snapshots, callRecords] = await Promise.all([
      this.db.select().from(consensusSnapshots),
      this.callsService.listRecords(),
    ])
    const tickerByCompanyId = new Map(
      callRecords.map((call) => [call.companyId, call.ticker]),
    )
    const seriesByTicker = await this.pricesService.loadSeries([
      ...new Set(tickerByCompanyId.values()),
      this.settings.benchmarkTicker,
    ])
    const benchmark = seriesByTicker.get(this.settings.benchmarkTicker)
    if (!benchmark) {
      return []
    }

    return scoreSnapshots(
      snapshots,
      tickerByCompanyId,
      seriesByTicker,
      benchmark,
      this.settings.targetMove,
    )
  }

  private snapshotDates(callRecords: CallRecord[]): string[] {
    if (callRecords.length === 0) {
      return []
    }
    const today = todayInNewYork()
    const firstDate = callRecords[0].publishedOn
    return [...new Set([...weekEnds(firstDate, today), today])]
  }

  private snapshotsOn(
    asOf: string,
    callsByCompany: Map<string, CallRecord[]>,
    outcomeRecords: OutcomeRecord[],
    callRecords: CallRecord[],
    seriesByTicker: Map<string, PriceSeries>,
  ): SnapshotRow[] {
    // What was known on `asOf`, shared by every company that day.
    const trackRecords = TrackRecordModel.build(
      callRecords,
      outcomeRecords,
      asOf,
    )
    const priors = OutcomePriors.fromOutcomes(outcomeRecords, asOf)

    return [...callsByCompany.entries()].flatMap(
      ([companyId, companyCalls]) => {
        const series = seriesByTicker.get(companyCalls[0].ticker)
        const priceIndex = series?.indexOnOrBefore(asOf) ?? -1
        const consensus = ConsensusModel.compute({
          asOf,
          calls: companyCalls,
          trackRecords,
          priors,
          price: series && priceIndex >= 0 ? series.closeAt(priceIndex) : null,
        })
        return consensus ? [this.toRow(companyId, consensus)] : []
      },
    )
  }

  private toRow(companyId: string, consensus: Consensus): SnapshotRow {
    return {
      companyId,
      asOf: consensus.asOf,
      score: consensus.score,
      rating: consensus.rating,
      callCount: consensus.callCount,
      effectiveCallCount: consensus.effectiveCallCount,
      price: consensus.price,
      expected: consensus.expected,
    }
  }

  private async replace(rows: SnapshotRow[]): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await transaction.delete(consensusSnapshots).where(sql`true`)
      for (const batch of chunk(rows, ConsensusService.INSERT_BATCH_SIZE)) {
        await transaction.insert(consensusSnapshots).values(batch)
      }
    })
  }
}
