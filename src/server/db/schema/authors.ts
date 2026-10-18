import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * A person who makes calls, as known to one source. A followed author has
 * their own articles synced, across every ticker; a favorite is starred and
 * listed first.
 */
export const authors = pgTable(
  'authors',
  {
    id: uuid().primaryKey().defaultRandom(),
    source: text().notNull(),
    externalId: text().notNull(),
    name: text().notNull(),
    url: text(),
    followedAt: timestamp({ withTimezone: true }),
    favoritedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('authors_source_external_id_key').on(
      table.source,
      table.externalId,
    ),
  ],
)
