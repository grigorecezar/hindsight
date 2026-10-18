import { DomainError } from '@/server/errors/DomainError'

export class InvalidTickerError extends DomainError {
  constructor(input: string) {
    super('That does not look like a ticker. Try something like AAPL.', {
      input,
    })
  }
}
