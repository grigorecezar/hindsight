import { connection } from 'next/server'
import { z } from 'zod'
import { DomainError } from '@/server/errors/DomainError'
import { getServices } from '@/server/services'
import { isSyncAuthorized } from '../_lib/isSyncAuthorized'
import { listItemSchema, windowSchema } from '../_lib/listSchemas'
import { unauthorized } from '../_lib/unauthorized'

const inputSchema = z.object({
  authorSlug: z.string().min(1).max(100),
  authorName: z.string().max(200).nullable(),
  windows: z.array(windowSchema).min(1).max(5),
  items: z.array(listItemSchema).max(500),
  isComplete: z.boolean(),
})

/** Stores rows the extension read off a followed author's own list. */
export async function POST(request: Request): Promise<Response> {
  await connection()
  if (!isSyncAuthorized(request)) {
    return unauthorized()
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Malformed author rows.' }, { status: 400 })
  }

  try {
    return Response.json(
      await getServices().browserSyncService.ingestAuthorItems(parsed.data),
    )
  } catch (error) {
    if (error instanceof DomainError) {
      return Response.json({ error: error.message }, { status: 404 })
    }
    throw error
  }
}
