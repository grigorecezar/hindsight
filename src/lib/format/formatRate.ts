/** A share of a sample: 0.543 is "54%". */
export function formatRate(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  return `${Math.round(value * 100)}%`
}
