/**
 * The value below which a fraction `q` of the list falls, interpolating
 * between neighbours. Null for an empty list.
 */
export function quantile(values: readonly number[], q: number): number | null {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const fraction = position - lower
  return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction
}
