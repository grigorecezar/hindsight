import { ConfigurationError } from '@/server/errors/ConfigurationError'
import { configSchema } from './configSchema'
import type { AppConfig } from './types/AppConfig'

let cached: AppConfig | null = null

/**
 * Parses the environment once, on first use, so `next build` never needs a
 * database or API keys.
 */
export function getConfig(): AppConfig {
  if (cached) {
    return cached
  }

  // A blank line in .env (APP_PASSWORD=) means unset, not an empty value.
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([, value]) => value !== ''),
  )
  const result = configSchema.safeParse(environment)
  if (!result.success) {
    throw new ConfigurationError('invalid environment', {
      issues: result.error.issues.map((issue) => issue.path.join('.')),
    })
  }

  cached = result.data
  return cached
}
