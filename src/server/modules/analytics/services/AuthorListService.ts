import { AuthorsService } from '../../authors/services/AuthorsService'
import type { AuthorListFilter } from '../types/AuthorListFilter'
import type { AuthorListRow } from '../types/AuthorListRow'
import { AccuracyService } from './AccuracyService'

/**
 * The Authors page: every author with calls, plus the ones you follow or
 * starred before any calls arrived. Favorites first, then by skill.
 */
export class AuthorListService {
  constructor(
    private readonly accuracyService: AccuracyService,
    private readonly authorsService: AuthorsService,
  ) {}

  public async rows(filter: AuthorListFilter): Promise<AuthorListRow[]> {
    const [records, flagged] = await Promise.all([
      this.accuracyService.trackRecords(),
      this.authorsService.listFlagged(),
    ])
    const flaggedById = new Map(flagged.map((author) => [author.id, author]))
    const recordIds = new Set(records.map((record) => record.authorId))

    // Authors with calls, then flagged authors still waiting for any.
    const rows: AuthorListRow[] = [
      ...records.map((record) => {
        const author = flaggedById.get(record.authorId)
        return {
          authorId: record.authorId,
          slug: record.authorSlug ?? record.authorId,
          name: record.authorName,
          url: record.authorUrl,
          isFavorite: Boolean(author?.favoritedAt),
          isFollowed: Boolean(author?.followedAt),
          record,
        }
      }),
      ...flagged
        .filter((author) => !recordIds.has(author.id))
        .map((author) => ({
          authorId: author.id,
          slug: author.externalId,
          name: author.name,
          url: author.url,
          isFavorite: Boolean(author.favoritedAt),
          isFollowed: Boolean(author.followedAt),
          record: null,
        })),
    ]

    return rows
      .filter((row) => this.matches(row, filter))
      .sort(
        (a, b) =>
          Number(b.isFavorite) - Number(a.isFavorite) ||
          (b.record?.skill ?? -Infinity) - (a.record?.skill ?? -Infinity) ||
          a.name.localeCompare(b.name),
      )
  }

  private matches(row: AuthorListRow, filter: AuthorListFilter): boolean {
    if (filter === 'favorites') {
      return row.isFavorite
    }
    if (filter === 'following') {
      return row.isFollowed
    }
    return true
  }
}
