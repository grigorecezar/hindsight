const clock = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/**
 * The moment a New York wall clock shows a given date and time, across
 * daylight saving (New York is 4 or 5 hours behind UTC).
 */
export function newYorkInstant(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  for (const offsetHours of [4, 5]) {
    const candidate = new Date(
      Date.UTC(year, monthIndex, day, hour + offsetHours, minute),
    )
    const parts = Object.fromEntries(
      clock.formatToParts(candidate).map((part) => [part.type, part.value]),
    )
    const isMatch = Number(parts.hour) === hour && Number(parts.day) === day
    if (isMatch) {
      return candidate
    }
  }
  return new Date(Date.UTC(year, monthIndex, day, hour + 5, minute))
}
