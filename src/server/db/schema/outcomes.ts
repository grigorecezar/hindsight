import {
  boolean,
  date,
  doublePrecision,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { calls } from './calls'
import { horizonEnum } from './horizonEnum'

/**
 * What the stock did over one horizon after one call. A row exists only once
 * the horizon has fully passed. Returns are fractions (0.12 is 12%).
 */
export const outcomes = pgTable(
  'outcomes',
  {
    callId: uuid()
      .notNull()
      .references(() => calls.id, { onDelete: 'cascade' }),
    horizon: horizonEnum().notNull(),
    exitDate: date({ mode: 'string' }).notNull(),
    exitPrice: doublePrecision().notNull(),
    stockReturn: doublePrecision().notNull(),
    benchmarkReturn: doublePrecision().notNull(),
    excessReturn: doublePrecision().notNull(),
    // Best and worst point along the way, from the entry.
    maxRunup: doublePrecision().notNull(),
    maxDrawdown: doublePrecision().notNull(),
    // First day the stock moved TARGET_MOVE with the call, or against it.
    targetHitOn: date({ mode: 'string' }),
    stopHitOn: date({ mode: 'string' }),
    isHit: boolean().notNull(),
    computedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.callId, table.horizon] })],
)
