import type { WireSyncWindow } from './WireSyncWindow'

/** One followed author whose own article list the extension should read. */
export interface BrowserSyncAuthorTarget {
  slug: string
  name: string
  windows: WireSyncWindow[]
}
