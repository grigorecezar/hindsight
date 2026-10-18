import YahooFinance from 'yahoo-finance2'
import { MarketDataError } from '@/server/errors/MarketDataError'
import { toErrorMessage } from '@/server/errors/toErrorMessage'
import { createLogger } from '@/server/logging/createLogger'
import type { CompanyProfile } from '../types/CompanyProfile'
import type { DailyClose } from '../types/DailyClose'
import type { MarketDataProvider } from '../types/MarketDataProvider'
import { toNewYorkDate } from '../utils/toNewYorkDate'
import { toYahooSymbol } from '../utils/toYahooSymbol'

/**
 * Daily prices from Yahoo Finance. Free and keyless, so price history never
 * spends the RapidAPI quota. One request returns years of closes.
 */
export class YahooMarketDataProvider implements MarketDataProvider {
  private readonly logger = createLogger(YahooMarketDataProvider.name)
  private readonly yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey'],
  })

  public async fetchDailyCloses(
    ticker: string,
    fromDate: string,
  ): Promise<DailyClose[]> {
    const symbol = toYahooSymbol(ticker)

    try {
      const chart = await this.yahooFinance.chart(symbol, {
        period1: fromDate,
        interval: '1d',
      })
      return chart.quotes.flatMap((quote) => {
        const close = quote.close
        if (typeof close !== 'number') {
          return []
        }
        const adjustedClose = quote.adjclose ?? close
        return [{ date: toNewYorkDate(quote.date), close, adjustedClose }]
      })
    } catch (error) {
      throw new MarketDataError(
        'Yahoo price request failed',
        { ticker, symbol, reason: toErrorMessage(error) },
        { cause: error },
      )
    }
  }

  public async lookupCompany(ticker: string): Promise<CompanyProfile | null> {
    const symbol = toYahooSymbol(ticker)

    try {
      const quote = await this.yahooFinance.quote(symbol)
      if (!quote?.symbol) {
        return null
      }
      return {
        ticker: ticker.toUpperCase(),
        name: quote.longName ?? quote.shortName ?? null,
      }
    } catch (error) {
      this.logger.warn(
        { ticker, reason: toErrorMessage(error) },
        'yahoo lookup failed',
      )
      return null
    }
  }
}
