import { and, asc, eq, sql } from 'drizzle-orm'
import { chunk } from '@/server/common/utils/chunk'
import { authors, calls, companies } from '@/server/db/schema'
import type { Database } from '@/server/db/types/Database'
import { createLogger } from '@/server/logging/createLogger'
import type { SourceId } from '../../sources/enums/SourceId'
import type { SourceCall } from '../../sources/types/SourceCall'
import { toNewYorkDate } from '../../prices/utils/toNewYorkDate'
import type { CallRecord } from '../types/CallRecord'

/** Stores calls and their authors, and reads them back joined. */
export class CallsService {
  private static readonly INSERT_BATCH_SIZE = 500

  private readonly logger = createLogger(CallsService.name)

  constructor(private readonly db: Database) {}

  /**
   * Upserts calls from one source for one company. A call seen again keeps
   * its id and takes the latest rating and title, since authors edit.
   */
  public async save(
    source: SourceId,
    companyId: string,
    sourceCalls: readonly SourceCall[],
  ): Promise<number> {
    if (sourceCalls.length === 0) {
      return 0
    }

    const authorIds = await this.saveAuthors(source, sourceCalls)
    const rows = sourceCalls.map((call) => ({
      source,
      externalId: call.externalId,
      companyId,
      authorId: call.author
        ? (authorIds.get(call.author.externalId) ?? null)
        : null,
      rating: call.rating,
      publishedAt: call.publishedAt,
      title: call.title,
      url: call.url,
      raw: call.raw,
    }))

    for (const batch of chunk(rows, CallsService.INSERT_BATCH_SIZE)) {
      await this.db
        .insert(calls)
        .values(batch)
        .onConflictDoUpdate({
          target: [calls.source, calls.externalId, calls.companyId],
          set: {
            authorId: sql.raw('excluded.author_id'),
            rating: sql.raw('excluded.rating'),
            publishedAt: sql.raw('excluded.published_at'),
            title: sql.raw('excluded.title'),
            url: sql.raw('excluded.url'),
            raw: sql.raw('excluded.raw'),
            updatedAt: sql`now()`,
          },
        })
    }

    this.logger.info({ source, companyId, count: rows.length }, 'calls saved')
    return rows.length
  }

  /** Every call, oldest first, with its company's ticker and its author. */
  public async listRecords(companyId?: string): Promise<CallRecord[]> {
    const rows = await this.db
      .select({
        id: calls.id,
        source: calls.source,
        companyId: calls.companyId,
        ticker: companies.ticker,
        companyName: companies.name,
        authorId: calls.authorId,
        authorName: authors.name,
        authorSlug: authors.externalId,
        authorUrl: authors.url,
        rating: calls.rating,
        publishedAt: calls.publishedAt,
        entryDate: calls.entryDate,
        entryPrice: calls.entryPrice,
        title: calls.title,
        url: calls.url,
      })
      .from(calls)
      .innerJoin(companies, eq(companies.id, calls.companyId))
      .leftJoin(authors, eq(authors.id, calls.authorId))
      .where(companyId ? eq(calls.companyId, companyId) : undefined)
      .orderBy(asc(calls.publishedAt))
    return rows.map((row) => ({
      ...row,
      publishedOn: toNewYorkDate(row.publishedAt),
    }))
  }

  /** The publish date of the oldest stored call, or null when there are none. */
  public async oldestPublishedAt(): Promise<Date | null> {
    const [row] = await this.db
      .select({ oldest: sql<string | null>`min(${calls.publishedAt})` })
      .from(calls)
    return row?.oldest ? new Date(row.oldest) : null
  }

  /** The newest stored call from one source on one company. */
  public async newestPublishedAt(
    source: string,
    companyId: string,
  ): Promise<Date | null> {
    const [row] = await this.db
      .select({ newest: sql<string | null>`max(${calls.publishedAt})` })
      .from(calls)
      .where(and(eq(calls.source, source), eq(calls.companyId, companyId)))
    return row?.newest ? new Date(row.newest) : null
  }

  /** The newest stored call from one source by one author. */
  public async newestPublishedAtByAuthor(
    source: string,
    authorId: string,
  ): Promise<Date | null> {
    const [row] = await this.db
      .select({ newest: sql<string | null>`max(${calls.publishedAt})` })
      .from(calls)
      .where(and(eq(calls.source, source), eq(calls.authorId, authorId)))
    return row?.newest ? new Date(row.newest) : null
  }

  private async saveAuthors(
    source: SourceId,
    sourceCalls: readonly SourceCall[],
  ): Promise<Map<string, string>> {
    const uniqueAuthors = new Map(
      sourceCalls
        .flatMap((call) => (call.author ? [call.author] : []))
        .map((author) => [author.externalId, author]),
    )
    if (uniqueAuthors.size === 0) {
      return new Map()
    }

    const saved = await this.db
      .insert(authors)
      .values(
        [...uniqueAuthors.values()].map((author) => ({
          source,
          externalId: author.externalId,
          name: author.name,
          url: author.url,
        })),
      )
      .onConflictDoUpdate({
        target: [authors.source, authors.externalId],
        set: {
          name: sql.raw('excluded.name'),
          url: sql.raw('excluded.url'),
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: authors.id, externalId: authors.externalId })
    return new Map(saved.map((author) => [author.externalId, author.id]))
  }
}
