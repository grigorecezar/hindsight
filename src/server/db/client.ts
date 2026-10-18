import { drizzle } from 'drizzle-orm/postgres-js'
import postgres, { type Sql } from 'postgres'
import { getConfig } from '@/server/config/getConfig'
import { ConfigurationError } from '@/server/errors/ConfigurationError'
import * as schema from './schema'
import type { Database } from './types/Database'

// Kept on globalThis so dev hot reloads reuse one pool instead of leaking.
const holder = globalThis as unknown as {
  hindsightSql?: Sql
  hindsightDb?: Database
}

/** The raw postgres.js client, for advisory locks and bulk SQL. */
export function getSql(): Sql {
  if (holder.hindsightSql) {
    return holder.hindsightSql
  }

  const url = getConfig().DATABASE_URL
  if (!url) {
    throw new ConfigurationError('DATABASE_URL is not set')
  }

  holder.hindsightSql = postgres(url, { max: 10, onnotice: () => {} })
  return holder.hindsightSql
}

export function getDb(): Database {
  if (holder.hindsightDb) {
    return holder.hindsightDb
  }

  holder.hindsightDb = drizzle(getSql(), { schema, casing: 'snake_case' })
  return holder.hindsightDb
}

/** Ends the pool so a script can exit. */
export async function closeDb(): Promise<void> {
  await holder.hindsightSql?.end({ timeout: 5 })
  holder.hindsightSql = undefined
  holder.hindsightDb = undefined
}
