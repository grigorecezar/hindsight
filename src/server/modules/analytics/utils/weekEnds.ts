import { addDays } from '@/server/common/utils/addDays'

/** Every Friday from `from` to `to` (YYYY-MM-DD), the end of each market week. */
export function weekEnds(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00Z`)
  const daysToFriday = (5 - start.getUTCDay() + 7) % 7
  const dates: string[] = []
  for (
    let date = addDays(from, daysToFriday);
    date <= to;
    date = addDays(date, 7)
  ) {
    dates.push(date)
  }
  return dates
}
