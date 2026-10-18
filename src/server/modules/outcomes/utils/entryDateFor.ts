import { addDays } from '@/server/common/utils/addDays'

const clockFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

// The regular session closes at 4pm New York time.
const MARKET_CLOSE_MINUTES = 16 * 60

/**
 * The earliest date a reader could have traded on a call: the publish date
 * if it went out before the close, otherwise the next day. The entry is the
 * first trading day on or after this date, at its close, so a call never
 * gets credit for a move that happened before anyone could read it.
 */
export function entryDateFor(publishedAt: Date): string {
  const parts = Object.fromEntries(
    clockFormatter
      .formatToParts(publishedAt)
      .map((part) => [part.type, part.value]),
  )
  const date = `${parts.year}-${parts.month}-${parts.day}`
  const minutes = Number(parts.hour) * 60 + Number(parts.minute)
  return minutes >= MARKET_CLOSE_MINUTES ? addDays(date, 1) : date
}
