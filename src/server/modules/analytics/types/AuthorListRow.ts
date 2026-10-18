import type { AuthorTrackRecord } from './AuthorTrackRecord'

/** One author on the Authors page, with or without calls yet. */
export interface AuthorListRow {
  authorId: string
  slug: string
  name: string
  url: string | null
  isFavorite: boolean
  isFollowed: boolean
  record: AuthorTrackRecord | null
}
