import type { syncStates } from '@/server/db/schema'

export type SyncState = typeof syncStates.$inferSelect
