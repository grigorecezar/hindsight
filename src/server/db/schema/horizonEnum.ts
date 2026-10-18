import { pgEnum } from 'drizzle-orm/pg-core'
import { Horizon } from '../../modules/outcomes/enums/Horizon'

export const horizonEnum = pgEnum('horizon', Horizon)
