/**
 * Root of every error we throw. Carries structured fields for the logs, so
 * the message stays a short, stable sentence.
 */
export class BaseError extends Error {
  public readonly fields: Record<string, unknown>

  constructor(
    message: string,
    fields: Record<string, unknown> = {},
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = new.target.name
    this.fields = fields
  }
}
