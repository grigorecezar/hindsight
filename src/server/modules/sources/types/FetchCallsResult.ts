import type { SourceCall } from './SourceCall'

export interface FetchCallsResult {
  calls: SourceCall[]
  // Items about the company that carried no rating (news, unrated pieces).
  unratedCount: number
  requestCount: number
  quotaRemaining: number | null
}
