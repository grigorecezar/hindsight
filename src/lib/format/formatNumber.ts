const formatter = new Intl.NumberFormat('en-US')

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  return formatter.format(value)
}
