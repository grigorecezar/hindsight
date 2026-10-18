import { and, eq, sql } from 'drizzle-orm'
import { authorSyncStates, syncStates } from '@/server/db/schema'
import type { Database } from '@/server/db/types/Database'
import type { Company } from '../../companies/types/Company'
import { RunKind } from '../../runs/enums/RunKind'
import type { Source } from '../../sources/types/Source'
import type { AuthorSyncState } from '../types/AuthorSyncState'
import type { CallSyncSettings } from '../types/CallSyncSettings'
import type { CompanySyncResult } from '../types/CompanySyncResult'
import type { SyncState } from '../types/SyncState'
import type { SyncWindow } from '../types/SyncWindow'
import { syncWindows } from '../utils/syncWindows'
import { CallsService } from './CallsService'

/**
 * Keeps track of how far each source's sync of each company has got, and
 * decides what to read next. Calls arrive two ways: pulled by a run from a
 * `Source`, or pushed in by the browser extension. Both go through here.
 */
export class CallSyncService {
  private static readonly DAY_MS = 86_400_000

  constructor(
    private readonly db: Database,
    private readonly callsService: CallsService,
    private readonly settings: CallSyncSettings,
  ) {}

  /** What to read next for one company from one source. */
  public async windowsFor(
    source: string,
    companyId: string,
  ): Promise<SyncWindow[]> {
    const state = await this.findState(source, companyId)
    return syncWindows(state, this.settings.historyDays)
  }

  /**
   * Records that one window was read to the end. History coverage only
   * moves back when a window was read completely, so an interrupted sync
   * is simply read again next time.
   */
  public async markWindowSynced(
    source: string,
    companyId: string,
    window: SyncWindow,
  ): Promise<void> {
    const now = new Date()
    const newest = await this.callsService.newestPublishedAt(source, companyId)

    await this.db
      .insert(syncStates)
      .values({
        source,
        companyId,
        lastSyncedAt: now,
        backfilledAt: window.isBackfill ? now : null,
        coveredFrom: window.since,
        latestPublishedAt: newest,
      })
      .onConflictDoUpdate({
        target: [syncStates.source, syncStates.companyId],
        set: {
          lastSyncedAt: now,
          backfilledAt: sql`coalesce(${syncStates.backfilledAt}, excluded.backfilled_at)`,
          coveredFrom: sql`least(${syncStates.coveredFrom}, excluded.covered_from)`,
          latestPublishedAt: sql`greatest(${syncStates.latestPublishedAt}, excluded.latest_published_at)`,
        },
      })
  }

  /** What to read next of a followed author's own article list. */
  public async authorWindowsFor(
    source: string,
    authorId: string,
  ): Promise<SyncWindow[]> {
    const [state] = await this.db
      .select()
      .from(authorSyncStates)
      .where(
        and(
          eq(authorSyncStates.source, source),
          eq(authorSyncStates.authorId, authorId),
        ),
      )
    return syncWindows(state ?? null, this.settings.historyDays)
  }

  /** Records that one window of an author's list was read to the end. */
  public async markAuthorWindowSynced(
    source: string,
    authorId: string,
    window: SyncWindow,
  ): Promise<void> {
    const now = new Date()
    const newest = await this.callsService.newestPublishedAtByAuthor(
      source,
      authorId,
    )

    await this.db
      .insert(authorSyncStates)
      .values({
        source,
        authorId,
        lastSyncedAt: now,
        backfilledAt: window.isBackfill ? now : null,
        coveredFrom: window.since,
        latestPublishedAt: newest,
      })
      .onConflictDoUpdate({
        target: [authorSyncStates.source, authorSyncStates.authorId],
        set: {
          lastSyncedAt: now,
          backfilledAt: sql`coalesce(${authorSyncStates.backfilledAt}, excluded.backfilled_at)`,
          coveredFrom: sql`least(${authorSyncStates.coveredFrom}, excluded.covered_from)`,
          latestPublishedAt: sql`greatest(${authorSyncStates.latestPublishedAt}, excluded.latest_published_at)`,
        },
      })
  }

  public async listAuthorStates(): Promise<AuthorSyncState[]> {
    return this.db.select().from(authorSyncStates)
  }

  /** A run pulling one company from a `Source`, window by window. */
  public async syncCompany(
    source: Source,
    company: Company,
    kind: RunKind,
  ): Promise<CompanySyncResult> {
    const windows = await this.windowsFor(source.id, company.id)
    const result: CompanySyncResult = {
      fetchedCount: 0,
      savedCount: 0,
      unratedCount: 0,
      requestCount: 0,
      quotaRemaining: null,
    }

    for (const window of this.withResync(windows, kind)) {
      const fetched = await source.fetchCalls({
        ticker: company.ticker,
        since: window.since,
        until: window.until,
      })
      result.fetchedCount += fetched.calls.length
      result.savedCount += await this.callsService.save(
        source.id,
        company.id,
        fetched.calls,
      )
      result.unratedCount += fetched.unratedCount
      result.requestCount += fetched.requestCount
      result.quotaRemaining = fetched.quotaRemaining ?? result.quotaRemaining
      await this.markWindowSynced(source.id, company.id, window)
    }
    return result
  }

  public async listStates(): Promise<SyncState[]> {
    return this.db.select().from(syncStates)
  }

  /** Whether a source has never covered any history for this company. */
  public async needsBackfill(
    source: Source,
    companyId: string,
  ): Promise<boolean> {
    const state = await this.findState(source.id, companyId)
    return !state?.coveredFrom
  }

  /** A monthly run re-reads RESYNC_DAYS, to catch edited calls. */
  private withResync(windows: SyncWindow[], kind: RunKind): SyncWindow[] {
    if (kind !== RunKind.MONTHLY) {
      return windows
    }
    const resyncSince = new Date(
      Date.now() - this.settings.resyncDays * CallSyncService.DAY_MS,
    )
    return windows.map((window) =>
      window.until === null && window.since > resyncSince
        ? { ...window, since: resyncSince }
        : window,
    )
  }

  private async findState(
    source: string,
    companyId: string,
  ): Promise<SyncState | null> {
    const [state] = await this.db
      .select()
      .from(syncStates)
      .where(
        and(eq(syncStates.source, source), eq(syncStates.companyId, companyId)),
      )
    return state ?? null
  }
}
