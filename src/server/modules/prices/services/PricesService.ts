import { and, asc, desc, gte, inArray, sql } from 'drizzle-orm'
import { chunk } from '@/server/common/utils/chunk'
import { prices } from '@/server/db/schema'
import type { Database } from '@/server/db/types/Database'
import { describeError } from '@/server/errors/describeError'
import { createLogger } from '@/server/logging/createLogger'
import type { DailyClose } from '../types/DailyClose'
import type { LatestClose } from '../types/LatestClose'
import type { MarketDataProvider } from '../types/MarketDataProvider'
import type { PriceRefreshResult } from '../types/PriceRefreshResult'
import { PriceSeries } from '../utils/PriceSeries'

export class PricesService {
  private static readonly INSERT_BATCH_SIZE = 1000

  private readonly logger = createLogger(PricesService.name)

  constructor(
    private readonly db: Database,
    private readonly marketDataProvider: MarketDataProvider,
  ) {}

  /**
   * Re-reads each ticker's whole history from `fromDate`. Always the whole
   * history, because adjusted closes are restated after every dividend and a
   * partial refresh would mix two adjustments in one series.
   */
  public async refresh(
    tickers: readonly string[],
    fromDate: string,
  ): Promise<PriceRefreshResult> {
    const result: PriceRefreshResult = { savedCount: 0, problems: [] }

    for (const ticker of tickers) {
      try {
        const closes = await this.marketDataProvider.fetchDailyCloses(
          ticker,
          fromDate,
        )
        await this.save(ticker, closes)
        result.savedCount += closes.length
      } catch (error) {
        const message = describeError(error)
        this.logger.warn({ ticker, message }, 'price refresh failed')
        result.problems.push({ ticker, message })
      }
    }

    this.logger.info(
      { tickerCount: tickers.length, savedCount: result.savedCount },
      'prices refreshed',
    )
    return result
  }

  public async loadSeries(
    tickers: readonly string[],
    fromDate = '1900-01-01',
  ): Promise<Map<string, PriceSeries>> {
    const series = new Map<string, PriceSeries>()
    if (tickers.length === 0) {
      return series
    }

    const rows = await this.db
      .select()
      .from(prices)
      .where(
        and(inArray(prices.ticker, [...tickers]), gte(prices.date, fromDate)),
      )
      .orderBy(asc(prices.ticker), asc(prices.date))

    const rowsByTicker = Map.groupBy(rows, (row) => row.ticker)
    for (const ticker of tickers) {
      const tickerRows = rowsByTicker.get(ticker) ?? []
      series.set(ticker, PriceSeries.fromDailyCloses(ticker, tickerRows))
    }
    return series
  }

  /** Each ticker's most recent close. */
  public async latestCloses(
    tickers: readonly string[],
  ): Promise<Map<string, LatestClose>> {
    if (tickers.length === 0) {
      return new Map()
    }

    const rows = await this.db
      .selectDistinctOn([prices.ticker], {
        ticker: prices.ticker,
        date: prices.date,
        close: prices.close,
      })
      .from(prices)
      .where(inArray(prices.ticker, [...tickers]))
      .orderBy(asc(prices.ticker), desc(prices.date))
    return new Map(
      rows.map((row) => [row.ticker, { date: row.date, close: row.close }]),
    )
  }

  private async save(ticker: string, closes: DailyClose[]): Promise<void> {
    for (const batch of chunk(closes, PricesService.INSERT_BATCH_SIZE)) {
      await this.db
        .insert(prices)
        .values(batch.map((close) => ({ ticker, ...close })))
        .onConflictDoUpdate({
          target: [prices.ticker, prices.date],
          set: {
            close: sql.raw('excluded.close'),
            adjustedClose: sql.raw('excluded.adjusted_close'),
          },
        })
    }
  }
}
