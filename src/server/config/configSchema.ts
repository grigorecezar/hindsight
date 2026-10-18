import { z } from 'zod'

/**
 * Every environment variable the server reads. Defaults are the values we
 * run with; override them in `.env` locally or in Railway's variables.
 */
export const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().min(1).optional(),

  // Basic auth for the whole app. Unset means no auth (local only).
  APP_PASSWORD: z.string().min(1).optional(),
  // Bearer token for POST /api/runs. Unset disables the endpoint.
  CRON_SECRET: z.string().min(1).optional(),
  // Bearer token the browser extension sends to /api/sync. Required when the
  // app is deployed; locally (no APP_PASSWORD) the endpoints are open.
  SYNC_TOKEN: z.string().min(1).optional(),

  // How far back each company's history reaches. Raise it later and the next
  // sync fetches only the older stretch that is missing.
  BACKFILL_DAYS: z.coerce.number().int().positive().default(1095),
  // How far back the monthly run re-reads, to catch edited ratings.
  RESYNC_DAYS: z.coerce.number().int().positive().default(90),
  // What excess return is measured against.
  BENCHMARK_TICKER: z.string().default('SPY'),
  // The move (as a fraction) that counts as a call reaching its target.
  TARGET_MOVE: z.coerce.number().positive().max(1).default(0.1),
})
