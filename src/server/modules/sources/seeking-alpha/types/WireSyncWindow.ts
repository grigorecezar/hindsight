/** A sync window as JSON: ISO timestamps, `until` null for "up to now". */
export interface WireSyncWindow {
  since: string
  until: string | null
  isBackfill: boolean
}
