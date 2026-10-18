const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** The New York calendar date of a moment, as YYYY-MM-DD. */
export function toNewYorkDate(moment: Date): string {
  return formatter.format(moment)
}
