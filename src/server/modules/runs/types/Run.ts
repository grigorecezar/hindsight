import type { runs } from '@/server/db/schema'

export type Run = typeof runs.$inferSelect
