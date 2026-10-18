import { connection } from 'next/server'
import { getServices } from '@/server/services'
import { isSyncAuthorized } from '../_lib/isSyncAuthorized'
import { unauthorized } from '../_lib/unauthorized'

/** What the extension should read: every company and its windows. */
export async function GET(request: Request): Promise<Response> {
  await connection()
  if (!isSyncAuthorized(request)) {
    return unauthorized()
  }
  return Response.json(await getServices().browserSyncService.plan())
}
