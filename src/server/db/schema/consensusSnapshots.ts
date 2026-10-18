import {
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import type { ExpectedByHorizon } from '../../modules/analytics/types/ExpectedByHorizon'
import { companies } from './companies'
import { ratingEnum } from './ratingEnum'

/**
 * The consensus for one company as it stood on one day, computed only from
 * what was known that day. One per week (Fridays) plus today, rebuilt
 * on every run, so the model itself can be scored like an author.
 */
export const consensusSnapshots = pgTable(
  'consensus_snapshots',
  {
    companyId: uuid()
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    asOf: date({ mode: 'string' }).notNull(),
    score: doublePrecision().notNull(),
    rating: ratingEnum().notNull(),
    callCount: integer().notNull(),
    effectiveCallCount: doublePrecision().notNull(),
    price: doublePrecision(),
    expected: jsonb().$type<ExpectedByHorizon>().notNull(),
    computedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.companyId, table.asOf] })],
)
