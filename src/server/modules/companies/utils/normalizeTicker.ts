import { InvalidTickerError } from '../errors/InvalidTickerError'

const TICKER_PATTERN = /^[A-Z][A-Z0-9.-]{0,9}$/

/** Uppercases a typed ticker ("$aapl " is AAPL) or throws if it is not one. */
export function normalizeTicker(input: string): string {
  const ticker = input.trim().replace(/^\$/, '').toUpperCase()
  if (!TICKER_PATTERN.test(ticker)) {
    throw new InvalidTickerError(input)
  }
  return ticker
}
