/** The average, or null for an empty list. */
export function mean(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
