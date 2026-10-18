import type { JsonApiIdentifier } from './JsonApiIdentifier'

/** The slice of a JSON:API resource we read. Everything else is ignored. */
export interface JsonApiResource {
  id: string | number
  type: string
  attributes?: Record<string, unknown>
  relationships?: Record<
    string,
    { data?: JsonApiIdentifier | JsonApiIdentifier[] | null } | undefined
  >
  links?: Record<string, unknown>
}
