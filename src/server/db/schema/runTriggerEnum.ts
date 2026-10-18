import { pgEnum } from 'drizzle-orm/pg-core'
import { RunTrigger } from '../../modules/runs/enums/RunTrigger'

export const runTriggerEnum = pgEnum('run_trigger', RunTrigger)
