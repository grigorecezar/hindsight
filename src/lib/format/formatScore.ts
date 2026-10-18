/** A consensus score from -2 to 2: "+0.48". */
export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return ''
  }
  const magnitude = Math.abs(value).toFixed(2)
  if (value < 0) {
    return `−${magnitude}`
  }
  return `+${magnitude}`
}
