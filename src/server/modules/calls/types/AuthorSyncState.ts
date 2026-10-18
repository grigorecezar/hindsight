import type { authorSyncStates } from '@/server/db/schema'

export type AuthorSyncState = typeof authorSyncStates.$inferSelect
