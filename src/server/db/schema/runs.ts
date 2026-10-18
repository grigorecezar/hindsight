import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { RunStats } from '../../modules/runs/types/RunStats'
import { runKindEnum } from './runKindEnum'
import { runTriggerEnum } from './runTriggerEnum'

/** One execution of a job. Neither timestamp set means it is still going. */
export const runs = pgTable('runs', {
  id: uuid().primaryKey().defaultRandom(),
  kind: runKindEnum().notNull(),
  trigger: runTriggerEnum().notNull(),
  startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp({ withTimezone: true }),
  failedAt: timestamp({ withTimezone: true }),
  error: text(),
  stats: jsonb().$type<RunStats>(),
})
