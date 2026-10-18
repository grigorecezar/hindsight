import type { authors } from '@/server/db/schema'

export type Author = typeof authors.$inferSelect
