import type { WireSyncWindow } from './WireSyncWindow'

/** Raw Seeking Alpha feed pages the extension read for one window. */
export interface IngestPagesInput {
  ticker: string
  window: WireSyncWindow
  documents: unknown[]
  // True with the window's last page, so the bookmark can move.
  isWindowComplete: boolean
}
