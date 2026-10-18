/** Yahoo writes share classes with a dash: BRK.B is BRK-B. */
export function toYahooSymbol(ticker: string): string {
  return ticker.toUpperCase().replace(/\./g, '-')
}
