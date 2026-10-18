import type { SourceId } from '../enums/SourceId'
import type { FetchCallsRequest } from './FetchCallsRequest'
import type { FetchCallsResult } from './FetchCallsResult'

/**
 * A third party that publishes calls. Implement this to add one; see
 * SOURCES-README.md.
 */
export interface Source {
  readonly id: SourceId
  readonly name: string
  // False when credentials are missing, so runs skip it instead of failing.
  isConfigured(): boolean
  fetchCalls(request: FetchCallsRequest): Promise<FetchCallsResult>
}
