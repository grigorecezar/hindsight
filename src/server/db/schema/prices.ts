import {
  date,
  doublePrecision,
  pgTable,
  primaryKey,
  text,
} from 'drizzle-orm/pg-core'

/**
 * Daily closes. Keyed by ticker, not by company, because the benchmark has
 * prices but is not on the watchlist. Returns use the adjusted close (splits
 * and dividends); the close is what the stock actually traded at.
 */
export const prices = pgTable(
  'prices',
  {
    ticker: text().notNull(),
    date: date({ mode: 'string' }).notNull(),
    close: doublePrecision().notNull(),
    adjustedClose: doublePrecision().notNull(),
  },
  (table) => [primaryKey({ columns: [table.ticker, table.date] })],
)
