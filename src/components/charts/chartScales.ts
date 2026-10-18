/** Shared scale helpers for the hand drawn SVG charts. */

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

/** Round tick values covering [min, max], in steps of 1, 2, 2.5 or 5. */
export function niceTicks(min: number, max: number, count: number): number[] {
  const span = max - min || Math.abs(max) || 1
  const rawStep = span / count
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = [1, 2, 2.5, 5, 10]
    .map((factor) => factor * magnitude)
    .find((candidate) => candidate >= rawStep)!
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + step / 2; value += step) {
    ticks.push(Number(value.toFixed(6)))
  }
  return ticks
}

/** A label at the first trading day of every few months, years shown in January. */
export function monthTicks(
  dates: readonly string[],
  maxTicks: number,
): { index: number; label: string }[] {
  const starts = dates.flatMap((date, index) => {
    const isNewMonth =
      index > 0 && date.slice(0, 7) !== dates[index - 1].slice(0, 7)
    return isNewMonth ? [index] : []
  })
  const every =
    [1, 2, 3, 6, 12].find((months) => starts.length / months <= maxTicks) ?? 12

  return starts
    .filter((index) => (Number(dates[index].slice(5, 7)) - 1) % every === 0)
    .map((index) => {
      const [year, month] = dates[index].split('-')
      const monthIndex = Number(month) - 1
      return { index, label: monthIndex === 0 ? year : MONTHS[monthIndex] }
    })
}

export function formatAxisPrice(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`
  }
  return `$${Number.isInteger(value) ? value : value.toFixed(2)}`
}
