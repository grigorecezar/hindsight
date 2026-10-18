import { toNewYorkDate } from '@/server/modules/prices/utils/toNewYorkDate'

/** Today's date on the New York market calendar. */
export function todayInNewYork(): string {
  return toNewYorkDate(new Date())
}
