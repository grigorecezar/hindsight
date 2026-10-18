import { BaseError } from './BaseError'
import { toErrorMessage } from './toErrorMessage'

/** One line for a run's problem list: the message plus an HTTP status. */
export function describeError(error: unknown): string {
  const message = toErrorMessage(error)
  const status = error instanceof BaseError ? error.fields.status : undefined
  if (status === undefined) {
    return message
  }
  return `${message} (status ${String(status)})`
}
