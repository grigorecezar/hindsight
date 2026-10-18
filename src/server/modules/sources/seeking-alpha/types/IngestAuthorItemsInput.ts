import type { ListItem } from './ListItem'
import type { WireSyncWindow } from './WireSyncWindow'

/** Rows read off a followed author's own analysis list. */
export interface IngestAuthorItemsInput {
  authorSlug: string
  // The name as the author's page shows it, when the page shows one.
  authorName: string | null
  windows: WireSyncWindow[]
  items: ListItem[]
  isComplete: boolean
}
