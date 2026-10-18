import { pgEnum } from 'drizzle-orm/pg-core'
import { RunKind } from '../../modules/runs/enums/RunKind'

export const runKindEnum = pgEnum('run_kind', RunKind)
