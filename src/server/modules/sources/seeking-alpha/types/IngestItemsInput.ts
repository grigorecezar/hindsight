import type { ListItem } from './ListItem'
import type { WireSyncWindow } from './WireSyncWindow'

/** List rows read for one company. Rows outside every window are ignored. */
export interface IngestItemsInput {
  ticker: string
  windows: WireSyncWindow[]
  items: ListItem[]
  // True once the list was read past every window's start: the bookmark moves.
  isComplete: boolean
}
