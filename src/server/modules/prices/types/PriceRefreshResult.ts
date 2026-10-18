export interface PriceRefreshResult {
  savedCount: number
  problems: { ticker: string; message: string }[]
}
