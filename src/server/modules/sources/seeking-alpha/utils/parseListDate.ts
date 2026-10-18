import { newYorkInstant } from '@/server/common/utils/newYorkInstant'

const MONTHS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const HOUR_MS = 3_600_000
// The list shows no time of day, so assume the article went out after the
// close: the entry is then the next trading day, which never credits a call
// with a move nobody could act on.
const ASSUMED_HOUR = 16
// How far back a weekday and date are searched for the right year.
const MAX_YEARS_BACK = 7

/**
 * The publish moment for a date as Seeking Alpha's analysis list shows it:
 * "Fri, Oct 16" (this year or, by the weekday, an earlier one), "Oct 16,
 * 2025", "Today", "Yesterday", "3 hours ago". Null when it is none of those.
 */
export function parseListDate(
  text: string,
  now: Date = new Date(),
): Date | null {
  const cleaned = text.trim().replace(/\s+/g, ' ').toLowerCase()

  const relative = cleaned.match(
    /^(\d+)\s*(m|min|mins|minutes?|h|hr|hrs|hours?)\s+ago$/,
  )
  if (relative) {
    const amount = Number(relative[1])
    const isHours = relative[2].startsWith('h')
    return new Date(now.getTime() - amount * (isHours ? HOUR_MS : 60_000))
  }
  if (cleaned.startsWith('today')) {
    return onDay(now, 0)
  }
  if (cleaned.startsWith('yesterday')) {
    return onDay(now, -1)
  }

  const match = cleaned.match(
    /^(?:([a-z]{3})[a-z]*,?\s+)?([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/,
  )
  if (!match) {
    return null
  }
  const [, weekdayText, monthText, dayText, yearText] = match
  const monthIndex = MONTHS.indexOf(monthText)
  if (monthIndex === -1) {
    return null
  }

  const day = Number(dayText)
  const year = yearText
    ? Number(yearText)
    : yearFor(
        monthIndex,
        day,
        weekdayText ? WEEKDAYS.indexOf(weekdayText) : -1,
        now,
      )
  return year === null
    ? null
    : newYorkInstant(year, monthIndex, day, ASSUMED_HOUR)
}

/** The most recent year (not in the future) where the date falls on the weekday. */
function yearFor(
  monthIndex: number,
  day: number,
  weekday: number,
  now: Date,
): number | null {
  const latest = now.getTime() + 24 * HOUR_MS
  for (
    let year = now.getUTCFullYear();
    year >= now.getUTCFullYear() - MAX_YEARS_BACK;
    year--
  ) {
    const candidate = new Date(Date.UTC(year, monthIndex, day))
    const isPast = candidate.getTime() <= latest
    const isWeekday = weekday === -1 || candidate.getUTCDay() === weekday
    if (isPast && isWeekday) {
      return year
    }
  }
  return null
}

function onDay(now: Date, dayOffset: number): Date {
  const date = new Date(now.getTime() + dayOffset * 24 * HOUR_MS)
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .split('-')
    .map(Number)
  return newYorkInstant(year, month - 1, day, ASSUMED_HOUR)
}
