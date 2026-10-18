import type { WireSyncWindow } from './WireSyncWindow'

/** One company the extension should read, and the windows to read. */
export interface BrowserSyncTarget {
  ticker: string
  windows: WireSyncWindow[]
}
