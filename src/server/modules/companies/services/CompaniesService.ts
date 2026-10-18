import { asc, eq, isNotNull } from 'drizzle-orm'
import { companies } from '@/server/db/schema'
import type { Database } from '@/server/db/types/Database'
import { createLogger } from '@/server/logging/createLogger'
import type { MarketDataProvider } from '../../prices/types/MarketDataProvider'
import { UnknownTickerError } from '../errors/UnknownTickerError'
import type { AddCompanyResult } from '../types/AddCompanyResult'
import type { Company } from '../types/Company'
import { normalizeTicker } from '../utils/normalizeTicker'

/**
 * Every ticker Hindsight knows, and which of them are on the watchlist.
 * Tickers that come in through a followed author's articles are known but
 * not watched.
 */
export class CompaniesService {
  private readonly logger = createLogger(CompaniesService.name)

  constructor(
    private readonly db: Database,
    private readonly marketDataProvider: MarketDataProvider,
  ) {}

  /** The watchlist. */
  public async listWatched(): Promise<Company[]> {
    return this.db
      .select()
      .from(companies)
      .where(isNotNull(companies.watchedAt))
      .orderBy(asc(companies.ticker))
  }

  /** Every company, watched or not. */
  public async listAll(): Promise<Company[]> {
    return this.db.select().from(companies).orderBy(asc(companies.ticker))
  }

  public async findByTicker(input: string): Promise<Company | null> {
    const ticker = input.trim().toUpperCase()
    const [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.ticker, ticker))
    return company ?? null
  }

  /**
   * Puts a ticker on the watchlist. A ticker Hindsight already knows keeps
   * its history; a new one is checked against market data first.
   */
  public async add(input: string): Promise<AddCompanyResult> {
    const ticker = normalizeTicker(input)

    const existing = await this.findByTicker(ticker)
    if (existing) {
      return { company: await this.watch(existing), isNew: !existing.watchedAt }
    }

    const profile = await this.marketDataProvider.lookupCompany(ticker)
    if (!profile) {
      throw new UnknownTickerError(ticker)
    }

    const [company] = await this.db
      .insert(companies)
      .values({ ticker, name: profile.name, watchedAt: new Date() })
      .returning()
    this.logger.info({ companyId: company.id, ticker }, 'company added')
    return { company, isNew: true }
  }

  /**
   * A company a followed author wrote about, created unwatched when new.
   * The name lookup is best effort: an unknown ticker is still recorded.
   */
  public async ensureKnown(input: string): Promise<Company> {
    const ticker = normalizeTicker(input)
    const existing = await this.findByTicker(ticker)
    if (existing) {
      return existing
    }

    const profile = await this.marketDataProvider.lookupCompany(ticker)
    const [company] = await this.db
      .insert(companies)
      .values({ ticker, name: profile?.name ?? null })
      .onConflictDoNothing({ target: companies.ticker })
      .returning()
    if (!company) {
      return (await this.findByTicker(ticker))!
    }
    this.logger.info({ companyId: company.id, ticker }, 'company discovered')
    return company
  }

  public async unwatch(companyId: string): Promise<void> {
    await this.db
      .update(companies)
      .set({ watchedAt: null })
      .where(eq(companies.id, companyId))
    this.logger.info({ companyId }, 'company unwatched')
  }

  private async watch(company: Company): Promise<Company> {
    if (company.watchedAt) {
      return company
    }

    const [watched] = await this.db
      .update(companies)
      .set({ watchedAt: new Date() })
      .where(eq(companies.id, company.id))
      .returning()
    this.logger.info({ companyId: company.id }, 'company watched')
    return watched
  }
}
