import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { companies } from './companies'

/**
 * Where each source's sync of each company has got to: how far back its
 * history is covered, and the newest call seen.
 */
export const syncStates = pgTable(
  'sync_states',
  {
    source: text().notNull(),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    backfilledAt: timestamp({ withTimezone: true }),
    coveredFrom: timestamp({ withTimezone: true }),
    lastSyncedAt: timestamp({ withTimezone: true }),
    latestPublishedAt: timestamp({ withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.source, table.companyId] })],
)
