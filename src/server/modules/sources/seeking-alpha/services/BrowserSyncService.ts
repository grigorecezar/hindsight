import { createLogger } from '@/server/logging/createLogger'
import { AuthorNotFoundError } from '../../../authors/errors/AuthorNotFoundError'
import { AuthorsService } from '../../../authors/services/AuthorsService'
import { CallsService } from '../../../calls/services/CallsService'
import { CallSyncService } from '../../../calls/services/CallSyncService'
import type { Rating } from '../../../calls/enums/Rating'
import type { SyncWindow } from '../../../calls/types/SyncWindow'
import { CompanyNotFoundError } from '../../../companies/errors/CompanyNotFoundError'
import { InvalidTickerError } from '../../../companies/errors/InvalidTickerError'
import { CompaniesService } from '../../../companies/services/CompaniesService'
import type { Company } from '../../../companies/types/Company'
import { SourceId } from '../../enums/SourceId'
import type { SourceCall } from '../../types/SourceCall'
import type { BrowserSyncPlan } from '../types/BrowserSyncPlan'
import type { IngestAuthorItemsInput } from '../types/IngestAuthorItemsInput'
import type { IngestItemsInput } from '../types/IngestItemsInput'
import type { IngestItemsResult } from '../types/IngestItemsResult'
import type { IngestPagesInput } from '../types/IngestPagesInput'
import type { IngestPagesResult } from '../types/IngestPagesResult'
import type { ListItem } from '../types/ListItem'
import type { WireSyncWindow } from '../types/WireSyncWindow'
import { parseAnalysisPage } from '../utils/parseAnalysisPage'
import { parseListDate } from '../utils/parseListDate'
import { toRating } from '../utils/toRating'

/** A list row with its date and rating read, and whether a window wants it. */
interface ReadRow {
  item: ListItem
  publishedAt: Date | null
  rating: Rating | null
  isWanted: boolean
}

/**
 * The server half of the browser extension. The extension reads Seeking
 * Alpha inside your logged in tab; this tells it what to read (watched
 * companies and followed authors) and stores the rows it sends back. See
 * extension/README.md.
 */
export class BrowserSyncService {
  private static readonly SITE_URL = 'https://seekingalpha.com'

  private readonly logger = createLogger(BrowserSyncService.name)

  constructor(
    private readonly companiesService: CompaniesService,
    private readonly authorsService: AuthorsService,
    private readonly callsService: CallsService,
    private readonly callSyncService: CallSyncService,
  ) {}

  /** Every watched company and followed author, with what is left to read. */
  public async plan(): Promise<BrowserSyncPlan> {
    const [companies, authors] = await Promise.all([
      this.companiesService.listWatched(),
      this.authorsService.listFollowed(),
    ])
    const source = SourceId.SEEKING_ALPHA

    return {
      companies: await Promise.all(
        companies.map(async (company) => ({
          ticker: company.ticker,
          windows: (
            await this.callSyncService.windowsFor(source, company.id)
          ).map((window) => this.toWire(window)),
        })),
      ),
      authors: await Promise.all(
        authors.map(async (author) => ({
          slug: author.externalId,
          name: author.name,
          windows: (
            await this.callSyncService.authorWindowsFor(source, author.id)
          ).map((window) => this.toWire(window)),
        })),
      ),
    }
  }

  /**
   * Stores rows read off a company's analysis list. A row is a call when it
   * has a rating badge and a readable date inside one of the windows.
   */
  public async ingestItems(
    input: IngestItemsInput,
  ): Promise<IngestItemsResult> {
    const company = await this.companiesService.findByTicker(input.ticker)
    if (!company) {
      throw new CompanyNotFoundError(input.ticker)
    }

    // Keep the rated rows inside a window and save them.
    const windows = input.windows.map((window) => this.fromWire(window))
    const rows = this.readRows(input.items, windows)
    const calls = rows
      .filter((row) => row.isWanted)
      .map((row) => this.toSourceCall(row, company.ticker, null))
    const savedCount = await this.callsService.save(
      SourceId.SEEKING_ALPHA,
      company.id,
      calls,
    )

    // The list was read past every window: move the bookmark.
    for (const window of input.isComplete ? windows : []) {
      await this.callSyncService.markWindowSynced(
        SourceId.SEEKING_ALPHA,
        company.id,
        window,
      )
    }

    const result = this.summarize(rows, savedCount)
    this.logger.info(
      {
        ticker: company.ticker,
        itemCount: input.items.length,
        ...result,
        isComplete: input.isComplete,
      },
      'browser sync items saved',
    )
    return result
  }

  /**
   * Stores rows read off a followed author's own list. Each row's first
   * ticker is the company its rating is about; a company Hindsight has not
   * seen yet is added, unwatched, so the call can be scored.
   */
  public async ingestAuthorItems(
    input: IngestAuthorItemsInput,
  ): Promise<IngestItemsResult> {
    const author = await this.authorsService.findBySlug(input.authorSlug)
    if (!author) {
      throw new AuthorNotFoundError(input.authorSlug)
    }
    const authorName = input.authorName ?? author.name
    if (authorName !== author.name) {
      await this.authorsService.rename(author.id, authorName)
    }

    // Keep the rated rows inside a window, grouped by the company they rate.
    const windows = input.windows.map((window) => this.fromWire(window))
    const rows = this.readRows(input.items, windows)
    const wantedByTicker = Map.groupBy(
      rows.filter((row) => row.isWanted && row.item.tickers?.[0]),
      (row) => row.item.tickers![0].toUpperCase(),
    )

    let savedCount = 0
    for (const [ticker, tickerRows] of wantedByTicker) {
      const company = await this.knownCompany(ticker)
      if (!company) {
        continue
      }
      savedCount += await this.callsService.save(
        SourceId.SEEKING_ALPHA,
        company.id,
        tickerRows.map((row) =>
          this.toSourceCall(row, company.ticker, {
            slug: author.externalId,
            name: authorName,
          }),
        ),
      )
    }

    for (const window of input.isComplete ? windows : []) {
      await this.callSyncService.markAuthorWindowSynced(
        SourceId.SEEKING_ALPHA,
        author.id,
        window,
      )
    }

    const result = this.summarize(rows, savedCount)
    this.logger.info(
      {
        authorId: author.id,
        itemCount: input.items.length,
        ...result,
        isComplete: input.isComplete,
      },
      'browser sync author items saved',
    )
    return result
  }

  /** Parses and stores raw feed pages (Seeking Alpha's JSON:API) for one window. */
  public async ingest(input: IngestPagesInput): Promise<IngestPagesResult> {
    const company = await this.companiesService.findByTicker(input.ticker)
    if (!company) {
      throw new CompanyNotFoundError(input.ticker)
    }

    // Parse every page and keep the calls inside the window.
    const window = this.fromWire(input.window)
    const pages = input.documents.map((document) =>
      parseAnalysisPage(document, company.ticker),
    )
    const calls = this.inWindow(
      pages.flatMap((page) => page.calls),
      window,
    )
    const savedCount = await this.callsService.save(
      SourceId.SEEKING_ALPHA,
      company.id,
      calls,
    )
    const result: IngestPagesResult = {
      articleCount: pages.reduce((sum, page) => sum + page.articleCount, 0),
      savedCount,
      unratedCount: pages.reduce(
        (sum, page) => sum + page.unratedArticles.length,
        0,
      ),
      lockedCount: pages.reduce(
        (sum, page) => sum + page.lockedArticleCount,
        0,
      ),
    }

    // Only a fully read window with readable ratings moves the bookmark.
    const isLocked = result.lockedCount > 0 && calls.length === 0
    if (input.isWindowComplete && !isLocked) {
      await this.callSyncService.markWindowSynced(
        SourceId.SEEKING_ALPHA,
        company.id,
        window,
      )
    }

    this.logger.info(
      {
        ticker: company.ticker,
        ...result,
        isWindowComplete: input.isWindowComplete,
      },
      'browser sync pages saved',
    )
    return result
  }

  private readRows(items: ListItem[], windows: SyncWindow[]): ReadRow[] {
    return items.map((item) => {
      const publishedAt = this.publishedAt(item)
      const rating = toRating(item.rating)
      const isInWindow =
        publishedAt !== null &&
        windows.some(
          (window) =>
            publishedAt >= window.since &&
            (!window.until || publishedAt < window.until),
        )
      return {
        item,
        publishedAt,
        rating,
        isWanted: Boolean(rating) && isInWindow,
      }
    })
  }

  private summarize(rows: ReadRow[], savedCount: number): IngestItemsResult {
    const times = rows.flatMap((row) =>
      row.publishedAt ? [row.publishedAt.getTime()] : [],
    )
    return {
      savedCount,
      unratedCount: rows.filter((row) => !row.rating).length,
      undatedCount: rows.filter((row) => !row.publishedAt).length,
      oldestPublishedAt:
        times.length > 0 ? new Date(Math.min(...times)).toISOString() : null,
    }
  }

  /** The company for a ticker on an author's list, or null for an odd one. */
  private async knownCompany(ticker: string): Promise<Company | null> {
    try {
      return await this.companiesService.ensureKnown(ticker)
    } catch (error) {
      if (error instanceof InvalidTickerError) {
        this.logger.debug({ ticker }, 'author row ticker skipped')
        return null
      }
      throw error
    }
  }

  private publishedAt(item: ListItem): Date | null {
    const exact = item.datetime ? new Date(item.datetime) : null
    if (exact && !Number.isNaN(exact.getTime())) {
      return exact
    }
    return item.dateText ? parseListDate(item.dateText) : null
  }

  /** A row as a call. On an author's list the author comes from the page, not the row. */
  private toSourceCall(
    row: ReadRow,
    ticker: string,
    author: { slug: string; name: string } | null,
  ): SourceCall {
    const { item } = row
    const siteUrl = BrowserSyncService.SITE_URL
    const slug = author?.slug ?? item.authorSlug
    return {
      externalId: item.articleId,
      ticker: ticker.toUpperCase(),
      rating: row.rating!,
      publishedAt: row.publishedAt!,
      title: item.title,
      url: item.url ?? `${siteUrl}/article/${item.articleId}`,
      author: slug
        ? {
            externalId: slug,
            name: author?.name ?? item.authorName ?? slug,
            url: `${siteUrl}/author/${slug}`,
          }
        : null,
      raw: {
        from: 'analysis list',
        rating: item.rating,
        dateText: item.dateText,
      },
    }
  }

  /** Unique calls inside the window, the newest version of each. */
  private inWindow(calls: SourceCall[], window: SyncWindow): SourceCall[] {
    const unique = new Map<string, SourceCall>()
    for (const call of calls) {
      const isInside =
        call.publishedAt >= window.since &&
        (!window.until || call.publishedAt < window.until)
      if (isInside) {
        unique.set(call.externalId, call)
      }
    }
    return [...unique.values()]
  }

  private toWire(window: SyncWindow): WireSyncWindow {
    return {
      since: window.since.toISOString(),
      until: window.until?.toISOString() ?? null,
      isBackfill: window.isBackfill,
    }
  }

  private fromWire(window: WireSyncWindow): SyncWindow {
    return {
      since: new Date(window.since),
      until: window.until ? new Date(window.until) : null,
      isBackfill: window.isBackfill,
    }
  }
}
