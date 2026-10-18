/** Whole calendar days from one YYYY-MM-DD date to another. */
export function daysBetween(from: string, to: string): number {
  const milliseconds =
    new Date(`${to}T00:00:00Z`).getTime() -
    new Date(`${from}T00:00:00Z`).getTime()
  return Math.round(milliseconds / 86_400_000)
}
