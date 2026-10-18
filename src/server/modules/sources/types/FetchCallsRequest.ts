export interface FetchCallsRequest {
  ticker: string
  // Only calls published at or after this moment are wanted.
  since: Date
  // And before this one, when set.
  until: Date | null
}
