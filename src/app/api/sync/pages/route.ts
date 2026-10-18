import { connection } from 'next/server'
import { z } from 'zod'
import { DomainError } from '@/server/errors/DomainError'
import { getServices } from '@/server/services'
import { isSyncAuthorized } from '../_lib/isSyncAuthorized'
import { unauthorized } from '../_lib/unauthorized'

const inputSchema = z.object({
  ticker: z.string().min(1).max(12),
  window: z.object({
    since: z.iso.datetime({ offset: true }),
    until: z.iso.datetime({ offset: true }).nullable(),
    isBackfill: z.boolean(),
  }),
  documents: z.array(z.unknown()).min(1).max(10),
  isWindowComplete: z.boolean(),
})

/** Stores feed pages the extension read for one window of one company. */
export async function POST(request: Request): Promise<Response> {
  await connection()
  if (!isSyncAuthorized(request)) {
    return unauthorized()
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Malformed sync pages.' }, { status: 400 })
  }

  try {
    return Response.json(
      await getServices().browserSyncService.ingest(parsed.data),
    )
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ error: error.message }, { status: 404 })
    }
    throw error
  }
}
