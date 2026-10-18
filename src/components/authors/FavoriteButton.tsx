import { setAuthorFavorite } from '@/app/actions'

/** A star that adds or removes an author from your favorites. */
export function FavoriteButton({
  authorId,
  authorName,
  isFavorite,
  size = 'sm',
}: {
  authorId: string
  authorName: string
  isFavorite: boolean
  size?: 'sm' | 'lg'
}) {
  return (
    <form action={setAuthorFavorite} className="inline">
      <input type="hidden" name="authorId" value={authorId} />
      <input type="hidden" name="isFavorite" value={String(!isFavorite)} />
      <button
        type="submit"
        aria-label={
          isFavorite
            ? `Remove ${authorName} from favorites`
            : `Add ${authorName} to favorites`
        }
        aria-pressed={isFavorite}
        className={`leading-none transition-colors ${size === 'lg' ? 'text-[1.5rem]' : 'text-base'} ${
          isFavorite ? 'text-ink' : 'text-ink/40 hover:text-ink'
        }`}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </form>
  )
}
