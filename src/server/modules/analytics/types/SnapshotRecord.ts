import type { consensusSnapshots } from '@/server/db/schema'

export type SnapshotRecord = typeof consensusSnapshots.$inferSelect
