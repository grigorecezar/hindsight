/** A loggable message for anything thrown, including non Error values. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
