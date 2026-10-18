/**
 * Adds calendar months to a YYYY-MM-DD date, clamped to the month's last
 * day: January 31 plus one month is February 28 (or 29).
 */
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const targetMonthIndex = month - 1 + months
  const lastDay = new Date(Date.UTC(year, targetMonthIndex + 1, 0)).getUTCDate()
  const target = new Date(
    Date.UTC(year, targetMonthIndex, Math.min(day, lastDay)),
  )
  return target.toISOString().slice(0, 10)
}
