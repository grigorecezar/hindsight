import type { Rating } from '@/server/modules/calls/enums/Rating'
import { ratingLabel } from '@/server/modules/calls/utils/ratingLabel'
import { RatingMark } from './RatingMark'

/** A rating as its mark plus its name. The text stays ink. */
export function RatingBadge({
  rating,
  size = 'sm',
}: {
  rating: Rating
  size?: 'sm' | 'lg'
}) {
  const isLarge = size === 'lg'
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap ${isLarge ? 'gap-2.5' : 'gap-1.5'}`}
    >
      <RatingMark rating={rating} size={isLarge ? 18 : 10} />
      <span
        className={
          isLarge
            ? 'font-serif text-[2rem] leading-none font-medium tracking-[-0.015em]'
            : ''
        }
      >
        {ratingLabel(rating)}
      </span>
    </span>
  )
}
