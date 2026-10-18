import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Every ticker Hindsight has calls on. The watchlist is the companies with
 * `watchedAt` set; the rest came in through a followed author's articles and
 * are scored all the same. Unwatching keeps a company's history.
 */
export const companies = pgTable('companies', {
  id: uuid().primaryKey().defaultRandom(),
  ticker: text().notNull().unique(),
  name: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  watchedAt: timestamp({ withTimezone: true }),
})
