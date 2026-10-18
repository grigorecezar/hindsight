import {
  date,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { authors } from './authors'
import { companies } from './companies'
import { ratingEnum } from './ratingEnum'

/**
 * One author's rating on one company at one moment, from one source. For
 * Seeking Alpha a call is an article's rating. The entry is the first close
 * a reader could have traded at, filled in once prices are loaded.
 */
export const calls = pgTable(
  'calls',
  {
    id: uuid().primaryKey().defaultRandom(),
    source: text().notNull(),
    externalId: text().notNull(),
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    authorId: uuid().references(() => authors.id, { onDelete: 'set null' }),
    rating: ratingEnum().notNull(),
    publishedAt: timestamp({ withTimezone: true }).notNull(),
    title: text(),
    url: text(),
    entryDate: date({ mode: 'string' }),
    entryPrice: doublePrecision(),
    raw: jsonb(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('calls_source_external_id_company_id_key').on(
      table.source,
      table.externalId,
      table.companyId,
    ),
    index('calls_company_id_published_at_idx').on(
      table.companyId,
      table.publishedAt,
    ),
    index('calls_author_id_idx').on(table.authorId),
  ],
)
