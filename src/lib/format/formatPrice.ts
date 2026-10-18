const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  return formatter.format(value)
}
