import { formatPercent } from '@/lib/format/formatPercent'
import { formatPrice } from '@/lib/format/formatPrice'
import type { PeriodShape } from '@/server/modules/analytics/types/PeriodShape'

interface Describable {
  shape: PeriodShape
  change: number
  level?: number | null
  low?: number
  high?: number
}

/**
 * What the stock did, in words: "Flat around $562", "Jumped 30%", "Fell
 * 4.4%", "Choppy, between $564 and $690". A move bigger than the stock's
 * flat band is a jump or a drop.
 */
export function describePeriod(period: Describable, band: number): string {
  const size = formatPercent(Math.abs(period.change), { isSigned: false })
  const isBig = Math.abs(period.change) >= band
  if (period.shape === 'flat') {
    return period.level
      ? `Flat around ${formatPrice(period.level)}`
      : `Held flat, ended ${formatPercent(period.change)}`
  }
  if (period.shape === 'choppy') {
    return period.low && period.high
      ? `Choppy, between ${formatPrice(period.low)} and ${formatPrice(period.high)}`
      : `Choppy, ended ${formatPercent(period.change)}`
  }
  if (period.shape === 'up') {
    return `${isBig ? 'Jumped' : 'Rose'} ${size}`
  }
  return `${isBig ? 'Dropped' : 'Fell'} ${size}`
}

/** "in 1 day", "in 18 days" (trading days). */
export function inDays(tradingDays: number): string {
  const days = Math.max(1, tradingDays - 1)
  return `in ${days} ${days === 1 ? 'day' : 'days'}`
}
