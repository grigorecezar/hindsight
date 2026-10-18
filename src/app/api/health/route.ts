import { sql } from 'drizzle-orm'
import { connection } from 'next/server'
import { getDb } from '@/server/db/client'

/** Railway's health check: the app is up and can reach Postgres. */
export async function GET(): Promise<Response> {
  await connection()
  await getDb().execute(sql`select 1`)
  return Response.json({ ok: true })
}
