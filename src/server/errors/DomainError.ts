import { BaseError } from './BaseError'

/**
 * An expected failure the person using the app can act on. Its message is
 * shown to them as is, so it is written as product copy. Anything that is
 * not a DomainError is a bug and reaches the UI as a generic message.
 */
export class DomainError extends BaseError {}
