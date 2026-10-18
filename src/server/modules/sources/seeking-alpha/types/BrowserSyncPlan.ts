import type { BrowserSyncAuthorTarget } from './BrowserSyncAuthorTarget'
import type { BrowserSyncTarget } from './BrowserSyncTarget'

export interface BrowserSyncPlan {
  companies: BrowserSyncTarget[]
  authors: BrowserSyncAuthorTarget[]
}
