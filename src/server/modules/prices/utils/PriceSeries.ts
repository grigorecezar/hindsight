import type { DailyClose } from '../types/DailyClose'

/**
 * One ticker's daily closes, oldest first, with lookups by date. Dates are
 * ISO strings, so comparing them as strings compares them as dates.
 */
export class PriceSeries {
  constructor(
    public readonly ticker: string,
    private readonly dates: readonly string[],
    private readonly closes: readonly number[],
    private readonly adjustedCloses: readonly number[],
  ) {}

  public static fromDailyCloses(
    ticker: string,
    rows: readonly DailyClose[],
  ): PriceSeries {
    const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
    return new PriceSeries(
      ticker,
      sorted.map((row) => row.date),
      sorted.map((row) => row.close),
      sorted.map((row) => row.adjustedClose),
    )
  }

  public get length(): number {
    return this.dates.length
  }

  public get lastIndex(): number {
    return this.dates.length - 1
  }

  public dateAt(index: number): string {
    return this.dates[index]
  }

  public closeAt(index: number): number {
    return this.closes[index]
  }

  public adjustedAt(index: number): number {
    return this.adjustedCloses[index]
  }

  /** The first trading day on or after `date`, or -1 if there is none yet. */
  public indexOnOrAfter(date: string): number {
    let low = 0
    let high = this.dates.length
    while (low < high) {
      const middle = (low + high) >> 1
      if (this.dates[middle] < date) {
        low = middle + 1
        continue
      }
      high = middle
    }
    return low < this.dates.length ? low : -1
  }

  /** The last trading day on or before `date`, or -1 if there is none. */
  public indexOnOrBefore(date: string): number {
    const after = this.indexOnOrAfter(date)
    if (after === -1) {
      return this.dates.length - 1
    }
    return this.dates[after] === date ? after : after - 1
  }
}
