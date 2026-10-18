import { DomainError } from '@/server/errors/DomainError'

export class UnknownTickerError extends DomainError {
  constructor(ticker: string) {
    super(`We could not find prices for ${ticker}. Check the ticker.`, {
      ticker,
    })
  }
}
