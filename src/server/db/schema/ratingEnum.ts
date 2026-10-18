import { pgEnum } from 'drizzle-orm/pg-core'
import { Rating } from '../../modules/calls/enums/Rating'

export const ratingEnum = pgEnum('rating', Rating)
