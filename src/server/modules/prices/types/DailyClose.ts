/** One trading day. Dates are New York calendar dates, YYYY-MM-DD. */
export interface DailyClose {
  date: string
  close: number
  adjustedClose: number
}
