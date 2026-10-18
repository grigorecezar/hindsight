const longFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
})
const shortFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'America/New_York',
})

/** "October 17, 2026". Takes a moment or a YYYY-MM-DD date. */
export function formatDate(value: Date | string): string {
  return longFormatter.format(toMoment(value))
}

/** "Oct 17, 2026", for dense tables. */
export function formatShortDate(value: Date | string): string {
  return shortFormatter.format(toMoment(value))
}

// A bare date is read as noon in New York, so it never slips a day.
function toMoment(value: Date | string): Date {
  return typeof value === 'string' ? new Date(`${value}T12:00:00-05:00`) : value
}
