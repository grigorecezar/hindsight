import { addDays } from '@/server/common/utils/addDays'
import { PriceSeries } from '@/server/modules/prices/utils/PriceSeries'

/** A series of weekday closes from `start`, one price per trading day. */
export function weekdaySeries(
  ticker: string,
  start: string,
  priceAt: (tradingDay: number) => number,
  tradingDays: number,
): PriceSeries {
  const rows = []
  let date = start
  while (rows.length < tradingDays) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay()
    if (weekday !== 0 && weekday !== 6) {
      const price = priceAt(rows.length)
      rows.push({ date, close: price, adjustedClose: price })
    }
    date = addDays(date, 1)
  }
  return PriceSeries.fromDailyCloses(ticker, rows)
}
