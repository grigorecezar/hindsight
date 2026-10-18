import { DomainError } from '@/server/errors/DomainError'

export class CompanyNotFoundError extends DomainError {
  constructor(ticker: string) {
    super(`${ticker} is not on the watchlist.`, { ticker })
  }
}
