import { getConfig } from '@/server/config/getConfig'

/**
 * The extension's endpoints check a bearer token when SYNC_TOKEN is set.
 * Without one they are open only while the whole app is (no APP_PASSWORD,
 * which means local development).
 */
export function isSyncAuthorized(request: Request): boolean {
  const { SYNC_TOKEN, APP_PASSWORD } = getConfig()
  if (SYNC_TOKEN) {
    return request.headers.get('authorization') === `Bearer ${SYNC_TOKEN}`
  }
  return !APP_PASSWORD
}
