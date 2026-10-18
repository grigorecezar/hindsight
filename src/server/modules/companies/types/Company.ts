import type { companies } from '@/server/db/schema'

export type Company = typeof companies.$inferSelect
