/**
 * A fraction as a percent: 0.123 is "+12.3%". Negative numbers use a true
 * minus sign so columns line up.
 */
export function formatPercent(
  value: number | null | undefined,
  options: { isSigned?: boolean; digits?: number } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return ''
  }

  const { isSigned = true, digits = 1 } = options
  const magnitude = `${Math.abs(value * 100).toFixed(digits)}%`
  if (value < 0) {
    return `−${magnitude}`
  }
  return isSigned && value > 0 ? `+${magnitude}` : magnitude
}
