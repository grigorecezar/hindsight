/** "2m 05s" or "41s" between two moments. */
export function formatDuration(from: Date, to: Date): string {
  const seconds = Math.max(
    0,
    Math.round((to.getTime() - from.getTime()) / 1000),
  )
  const minutes = Math.floor(seconds / 60)
  if (minutes === 0) {
    return `${seconds}s`
  }
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`
}
