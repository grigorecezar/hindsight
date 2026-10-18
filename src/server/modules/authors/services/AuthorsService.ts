import { and, asc, eq, isNotNull, or, sql } from 'drizzle-orm'
import { authors } from '@/server/db/schema'
import type { Database } from '@/server/db/types/Database'
import { createLogger } from '@/server/logging/createLogger'
import { SourceId } from '../../sources/enums/SourceId'
import type { Author } from '../types/Author'
import type { FollowAuthorResult } from '../types/FollowAuthorResult'
import { authorUrl } from '../utils/authorUrl'
import { nameFromSlug } from '../utils/nameFromSlug'
import { parseAuthorSlug } from '../utils/parseAuthorSlug'

/**
 * Seeking Alpha authors you follow (their own articles are synced, across
 * every ticker) and favorite (starred, listed first). An author's id on the
 * source is their profile slug.
 */
export class AuthorsService {
  private readonly logger = createLogger(AuthorsService.name)

  constructor(private readonly db: Database) {}

  /** Follows an author from a profile link or slug. */
  public async follow(input: string): Promise<FollowAuthorResult> {
    const slug = parseAuthorSlug(input)
    const existing = await this.findBySlug(slug)
    const [author] = await this.db
      .insert(authors)
      .values({
        source: SourceId.SEEKING_ALPHA,
        externalId: slug,
        name: nameFromSlug(slug),
        url: authorUrl(slug),
        followedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [authors.source, authors.externalId],
        set: {
          followedAt: sql`coalesce(${authors.followedAt}, now())`,
          updatedAt: sql`now()`,
        },
      })
      .returning()
    this.logger.info({ authorId: author.id, slug }, 'author followed')
    return { author, isNew: !existing?.followedAt }
  }

  public async unfollow(authorId: string): Promise<void> {
    await this.db
      .update(authors)
      .set({ followedAt: null, updatedAt: new Date() })
      .where(eq(authors.id, authorId))
    this.logger.info({ authorId }, 'author unfollowed')
  }

  public async setFavorite(
    authorId: string,
    isFavorite: boolean,
  ): Promise<void> {
    await this.db
      .update(authors)
      .set({
        favoritedAt: isFavorite ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(authors.id, authorId))
    this.logger.info({ authorId, isFavorite }, 'author favorite changed')
  }

  /** Takes the name as the author's own page shows it. */
  public async rename(authorId: string, name: string): Promise<void> {
    await this.db
      .update(authors)
      .set({ name, updatedAt: new Date() })
      .where(eq(authors.id, authorId))
  }

  public async findBySlug(slug: string): Promise<Author | null> {
    const [author] = await this.db
      .select()
      .from(authors)
      .where(
        and(
          eq(authors.source, SourceId.SEEKING_ALPHA),
          eq(authors.externalId, slug.toLowerCase()),
        ),
      )
    return author ?? null
  }

  public async listFollowed(): Promise<Author[]> {
    return this.db
      .select()
      .from(authors)
      .where(isNotNull(authors.followedAt))
      .orderBy(asc(authors.name))
  }

  /** Every author you follow or starred, with or without calls yet. */
  public async listFlagged(): Promise<Author[]> {
    return this.db
      .select()
      .from(authors)
      .where(or(isNotNull(authors.followedAt), isNotNull(authors.favoritedAt)))
      .orderBy(asc(authors.name))
  }
}
