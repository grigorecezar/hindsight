/**
 * The five step verdict on a call, bearish to bullish. Declaration order is
 * the Postgres enum order, so sorting by rating sorts by conviction.
 */
export enum Rating {
  STRONG_SELL = 'STRONG_SELL',
  SELL = 'SELL',
  HOLD = 'HOLD',
  BUY = 'BUY',
  STRONG_BUY = 'STRONG_BUY',
}
