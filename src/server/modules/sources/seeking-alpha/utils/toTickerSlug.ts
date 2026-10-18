/** Seeking Alpha's id for a ticker: lowercase, dots kept (BRK.B is brk.b). */
export function toTickerSlug(ticker: string): string {
  return ticker.trim().toLowerCase()
}
