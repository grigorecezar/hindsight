import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { getConfig } from '@/server/config/getConfig'
import { ConfigurationError } from '@/server/errors/ConfigurationError'
import { createLogger } from '@/server/logging/createLogger'

/** Applies pending migrations from ./drizzle. Railway runs it before deploys. */
async function main(): Promise<void> {
  const logger = createLogger('migrate')
  const url = getConfig().DATABASE_URL
  if (!url) {
    throw new ConfigurationError('DATABASE_URL is not set')
  }

  const sql = postgres(url, { max: 1, onnotice: () => {} })
  await migrate(drizzle(sql), { migrationsFolder: 'drizzle' })
  await sql.end()
  logger.info({}, 'migrations applied')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
