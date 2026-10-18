import type { JsonApiResource } from './JsonApiResource'

/**
 * Seeking Alpha's API speaks JSON:API, and the RapidAPI listing passes its
 * documents through. A list has `data` as an array, a details call as one
 * resource.
 */
export interface JsonApiDocument {
  data?: JsonApiResource | JsonApiResource[] | null
  included?: JsonApiResource[]
  meta?: Record<string, unknown>
}
