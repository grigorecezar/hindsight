import type { Author } from './Author'

export interface FollowAuthorResult {
  author: Author
  // False when the author was already followed.
  isNew: boolean
}
