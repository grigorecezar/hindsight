import type { Rating } from '../enums/Rating'
import { ratingScore } from './ratingScore'

/** 1 for buys, -1 for sells, 0 for a hold. */
export function ratingDirection(rating: Rating): number {
  return Math.sign(ratingScore(rating))
}
