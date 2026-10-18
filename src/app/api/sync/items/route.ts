import { connection } from 'next/server'
import { z } from 'zod'
import { DomainError } from '@/server/errors/DomainError'
import { getServices } from '@/server/services'
import { isSyncAuthorized } from '../_lib/isSyncAuthorized'
import { listItemSchema, windowSchema } from '../_lib/listSchemas'
import { unauthorized } from '../_lib/unauthorized'

const inputSchema = z.object({
  ticker: z.string().min(1).max(12),
  windows: z.array(windowSchema).min(1).max(5),
  items: z.array(listItemSchema).max(500),
  isComplete: z.boolean(),
})

/** Stores analysis list rows the extension read for one company. */
export async function POST(request: Request): Promise<Response> {
  await connection()
  if (!isSyncAuthorized(request)) {
    return unauthorized()
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Malformed list rows.' }, { status: 400 })
  }

  try {
    return Response.json(
      await getServices().browserSyncService.ingestItems(parsed.data),
    )
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ error: error.message }, { status: 404 })
    }
    throw error
  }
}
