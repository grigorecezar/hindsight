import pino, { type Logger } from 'pino'
import pretty from 'pino-pretty'
import { getConfig } from '@/server/config/getConfig'

let root: Logger | null = null

/**
 * A logger for one class or script. Log a short, stable event name plus a
 * fields object: `logger.info({ ticker, count }, 'calls saved')`, never data
 * interpolated into the message.
 */
export function createLogger(context: string): Logger {
  return rootLogger().child({ context })
}

function rootLogger(): Logger {
  if (root) {
    return root
  }

  const config = getConfig()
  const options = {
    level: config.LOG_LEVEL,
    redact: ['apiKey', '*.apiKey', 'headers["x-rapidapi-key"]'],
  }

  // Production emits JSON lines for Railway; everything else pretty prints.
  root =
    config.NODE_ENV === 'production'
      ? pino(options)
      : pino(options, pretty({ colorize: true, sync: true }))
  return root
}
