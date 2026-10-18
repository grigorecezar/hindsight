import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { authors } from './authors'

/**
 * Where the sync of a followed author's own article list has got to, the
 * author twin of `sync_states`.
 */
export const authorSyncStates = pgTable(
  'author_sync_states',
  {
    source: text().notNull(),
    authorId: uuid()
      .notNull()
      .references(() => authors.id, { onDelete: 'cascade' }),
    backfilledAt: timestamp({ withTimezone: true }),
    coveredFrom: timestamp({ withTimezone: true }),
    lastSyncedAt: timestamp({ withTimezone: true }),
    latestPublishedAt: timestamp({ withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.source, table.authorId] })],
)
