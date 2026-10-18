import { asc, eq, sql } from 'drizzle-orm'
import { chunk } from '@/server/common/utils/chunk'
import { calls, companies, outcomes } from '@/server/db/schema'
import type { Database } from '@/server/db/types/Database'
import { MarketDataError } from '@/server/errors/MarketDataError'
import { createLogger } from '@/server/logging/createLogger'
import type { CallRecord } from '../../calls/types/CallRecord'
import { CallsService } from '../../calls/services/CallsService'
import { PricesService } from '../../prices/services/PricesService'
import type { PriceSeries } from '../../prices/utils/PriceSeries'
import { HORIZONS } from '../constants/HORIZONS'
import type { OutcomeRecord } from '../types/OutcomeRecord'
import { computeOutcome } from '../utils/computeOutcome'
import { entryDateFor } from '../utils/entryDateFor'

type OutcomeRow = typeof outcomes.$inferInsert

interface Entry {
  callId: string
  entryDate: string
  entryPrice: number
}

/** Scores every call against what its stock did next. */
export class OutcomesService {
  private static readonly INSERT_BATCH_SIZE = 1000
  private static readonly UPDATE_BATCH_SIZE = 500

  private readonly logger = createLogger(OutcomesService.name)

  constructor(
    private readonly db: Database,
    private readonly callsService: CallsService,
    private readonly pricesService: PricesService,
    private readonly settings: { benchmarkTicker: string; targetMove: number },
  ) {}

  /**
   * Recomputes every call's entry and every matured outcome from stored
   * prices. A full rebuild, because a price restatement or an edited rating
   * can change any of them, and the data is small.
   */
  public async recompute(): Promise<number> {
    const callRecords = await this.callsService.listRecords()
    const tickers = [...new Set(callRecords.map((call) => call.ticker))]
    const seriesByTicker = await this.pricesService.loadSeries([
      ...tickers,
      this.settings.benchmarkTicker,
    ])

    // Without the benchmark nothing can be scored, so keep the old scores.
    const benchmark = seriesByTicker.get(this.settings.benchmarkTicker)
    if (!benchmark || benchmark.length === 0) {
      throw new MarketDataError('benchmark prices are missing', {
        benchmarkTicker: this.settings.benchmarkTicker,
      })
    }

    // Find each call's entry, then measure every horizon from it.
    const entries: Entry[] = []
    const rows: OutcomeRow[] = []
    for (const call of callRecords) {
      const series = seriesByTicker.get(call.ticker)
      const entryIndex = series?.indexOnOrAfter(entryDateFor(call.publishedAt))
      if (!series || entryIndex === undefined || entryIndex === -1) {
        continue
      }
      entries.push({
        callId: call.id,
        entryDate: series.dateAt(entryIndex),
        entryPrice: series.closeAt(entryIndex),
      })
      rows.push(...this.measure(call, series, benchmark, entryIndex))
    }

    await this.replace(entries, rows)
    this.logger.info(
      { callCount: callRecords.length, outcomeCount: rows.length },
      'outcomes recomputed',
    )
    return rows.length
  }

  /** Every stored outcome with its call, oldest call first. */
  public async listRecords(): Promise<OutcomeRecord[]> {
    const rows = await this.db
      .select({
        callId: outcomes.callId,
        source: calls.source,
        companyId: calls.companyId,
        ticker: companies.ticker,
        authorId: calls.authorId,
        rating: calls.rating,
        publishedAt: calls.publishedAt,
        entryDate: calls.entryDate,
        horizon: outcomes.horizon,
        exitDate: outcomes.exitDate,
        stockReturn: outcomes.stockReturn,
        benchmarkReturn: outcomes.benchmarkReturn,
        excessReturn: outcomes.excessReturn,
        maxRunup: outcomes.maxRunup,
        maxDrawdown: outcomes.maxDrawdown,
        targetHitOn: outcomes.targetHitOn,
        stopHitOn: outcomes.stopHitOn,
        isHit: outcomes.isHit,
      })
      .from(outcomes)
      .innerJoin(calls, eq(calls.id, outcomes.callId))
      .innerJoin(companies, eq(companies.id, calls.companyId))
      .orderBy(asc(calls.publishedAt))

    // An outcome only exists for a call with an entry.
    return rows.map((row) => ({ ...row, entryDate: row.entryDate ?? '' }))
  }

  private measure(
    call: CallRecord,
    series: PriceSeries,
    benchmark: PriceSeries,
    entryIndex: number,
  ): OutcomeRow[] {
    return HORIZONS.flatMap(({ horizon, months }) => {
      const values = computeOutcome({
        rating: call.rating,
        series,
        benchmark,
        entryIndex,
        months,
        targetMove: this.settings.targetMove,
      })
      return values ? [{ callId: call.id, horizon, ...values }] : []
    })
  }

  private async replace(entries: Entry[], rows: OutcomeRow[]): Promise<void> {
    await this.db.transaction(async (transaction) => {
      // Entries first: one UPDATE per batch from a VALUES list.
      for (const batch of chunk(entries, OutcomesService.UPDATE_BATCH_SIZE)) {
        const values = sql.join(
          batch.map(
            (entry) =>
              sql`(${entry.callId}::uuid, ${entry.entryDate}::date, ${entry.entryPrice}::float8)`,
          ),
          sql`, `,
        )
        await transaction.execute(sql`
          update calls
          set entry_date = v.entry_date, entry_price = v.entry_price
          from (values ${values}) as v(id, entry_date, entry_price)
          where calls.id = v.id
        `)
      }

      // Then swap the outcomes wholesale.
      await transaction.delete(outcomes)
      for (const batch of chunk(rows, OutcomesService.INSERT_BATCH_SIZE)) {
        await transaction.insert(outcomes).values(batch)
      }
    })
  }
}
