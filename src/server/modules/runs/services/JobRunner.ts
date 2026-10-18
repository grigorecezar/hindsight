import { addDays } from '@/server/common/utils/addDays'
import { todayInNewYork } from '@/server/common/utils/todayInNewYork'
import { describeError } from '@/server/errors/describeError'
import { createLogger } from '@/server/logging/createLogger'
import { ConsensusService } from '../../analytics/services/ConsensusService'
import { CallsService } from '../../calls/services/CallsService'
import { CallSyncService } from '../../calls/services/CallSyncService'
import { CompaniesService } from '../../companies/services/CompaniesService'
import type { Company } from '../../companies/types/Company'
import { OutcomesService } from '../../outcomes/services/OutcomesService'
import { PricesService } from '../../prices/services/PricesService'
import { toNewYorkDate } from '../../prices/utils/toNewYorkDate'
import { SourceRegistry } from '../../sources/services/SourceRegistry'
import type { Source } from '../../sources/types/Source'
import { RunKind } from '../enums/RunKind'
import type { RunTrigger } from '../enums/RunTrigger'
import type { RunOptions } from '../types/RunOptions'
import type { RunStats } from '../types/RunStats'
import { emptyRunStats } from '../utils/emptyRunStats'
import { JobLock } from './JobLock'
import { RunsService } from './RunsService'

interface JobRunnerSettings {
  benchmarkTicker: string
  backfillDays: number
}

/**
 * Runs the pipeline: pull calls from every configured source, refresh
 * prices, rescore every call, rebuild the consensus snapshots. One run at a
 * time, whoever starts it (cron, the app, the command line).
 */
export class JobRunner {
  // A weekly sync is due this long after the last one.
  private static readonly WEEKLY_INTERVAL_MS = 6.5 * 86_400_000
  // Prices start this many days before the oldest call.
  private static readonly PRICE_PADDING_DAYS = 30

  private readonly logger = createLogger(JobRunner.name)

  constructor(
    private readonly jobLock: JobLock,
    private readonly runsService: RunsService,
    private readonly companiesService: CompaniesService,
    private readonly sourceRegistry: SourceRegistry,
    private readonly callSyncService: CallSyncService,
    private readonly callsService: CallsService,
    private readonly pricesService: PricesService,
    private readonly outcomesService: OutcomesService,
    private readonly consensusService: ConsensusService,
    private readonly settings: JobRunnerSettings,
  ) {}

  /**
   * Runs one kind of job. Resolves to the run's id, or null when another
   * run already holds the lock.
   */
  public async run(kind: RunKind, options: RunOptions): Promise<string | null> {
    const runId = await this.jobLock.withLock(() => this.execute(kind, options))
    if (runId === null) {
      this.logger.info(
        { kind, trigger: options.trigger },
        'run skipped, another run is going',
      )
    }
    return runId
  }

  /**
   * What the daily cron calls. Runs the monthly resync once per calendar
   * month, otherwise the weekly sync when a week has passed, otherwise a
   * backfill when a new company is waiting for its first sync.
   */
  public async auto(trigger: RunTrigger): Promise<RunKind | null> {
    const kind = await this.dueKind()
    if (!kind) {
      this.logger.info({ trigger }, 'auto run found nothing due')
      return null
    }

    await this.run(kind, { trigger })
    return kind
  }

  private async dueKind(): Promise<RunKind | null> {
    const now = new Date()
    const startOfMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    const [lastMonthly, lastSync] = await Promise.all([
      this.runsService.lastFinished([RunKind.MONTHLY]),
      this.runsService.lastFinished([RunKind.WEEKLY, RunKind.MONTHLY]),
    ])

    if (!lastMonthly || lastMonthly.startedAt.getTime() < startOfMonth) {
      return RunKind.MONTHLY
    }
    if (
      !lastSync ||
      now.getTime() - lastSync.startedAt.getTime() >=
        JobRunner.WEEKLY_INTERVAL_MS
    ) {
      return RunKind.WEEKLY
    }
    return (await this.hasPendingBackfill()) ? RunKind.BACKFILL : null
  }

  private async execute(kind: RunKind, options: RunOptions): Promise<string> {
    await this.runsService.closeAbandoned()
    const run = await this.runsService.start(kind, options.trigger)
    const stats = { ...emptyRunStats(), ...options.syncStats }
    this.logger.info(
      { runId: run.id, kind, trigger: options.trigger },
      'run started',
    )

    try {
      await this.syncCalls(kind, options, stats)
      await this.refreshPrices(stats)
      stats.outcomesSaved = await this.outcomesService.recompute()
      stats.snapshotsSaved = await this.consensusService.rebuildSnapshots()

      await this.runsService.finish(run.id, stats)
      this.logger.info(
        { runId: run.id, kind, ...this.summary(stats) },
        'run finished',
      )
      return run.id
    } catch (error) {
      await this.runsService.fail(run.id, describeError(error), stats)
      this.logger.error({ runId: run.id, kind, err: error }, 'run failed')
      throw error
    }
  }

  /** Every configured source, every company the run covers. */
  private async syncCalls(
    kind: RunKind,
    options: RunOptions,
    stats: RunStats,
  ): Promise<void> {
    // These kinds arrive with their calls already stored.
    if (kind === RunKind.REFRESH || kind === RunKind.BROWSER_SYNC) {
      return
    }

    const companies = await this.companiesFor(options)
    stats.companyCount = companies.length
    for (const source of this.sourceRegistry.configured()) {
      for (const company of companies) {
        await this.syncCompany(source, company, kind, stats)
      }
    }
  }

  /** One company from one source. A failure is noted and the run goes on. */
  private async syncCompany(
    source: Source,
    company: Company,
    kind: RunKind,
    stats: RunStats,
  ): Promise<void> {
    const isSkipped =
      kind === RunKind.BACKFILL &&
      !(await this.callSyncService.needsBackfill(source, company.id))
    if (isSkipped) {
      return
    }

    try {
      const result = await this.callSyncService.syncCompany(
        source,
        company,
        kind,
      )
      stats.callsFetched += result.fetchedCount
      stats.callsSaved += result.savedCount
      stats.unratedSkipped += result.unratedCount
      stats.sourceRequests += result.requestCount
      stats.quotaRemaining = result.quotaRemaining ?? stats.quotaRemaining
    } catch (error) {
      const message = describeError(error)
      this.logger.warn(
        { ticker: company.ticker, source: source.id, message },
        'company sync failed',
      )
      stats.problems.push({
        ticker: company.ticker,
        step: `${source.name} sync`,
        message,
      })
    }
  }

  /**
   * Every company plus the benchmark, back to before the oldest call. That
   * includes companies off the watchlist: a followed author's calls on them
   * are scored too.
   */
  private async refreshPrices(stats: RunStats): Promise<void> {
    const companies = await this.companiesService.listAll()
    const oldest = await this.callsService.oldestPublishedAt()
    const fromDate = oldest
      ? addDays(toNewYorkDate(oldest), -JobRunner.PRICE_PADDING_DAYS)
      : addDays(todayInNewYork(), -this.settings.backfillDays)

    const tickers = [
      ...companies.map((company) => company.ticker),
      this.settings.benchmarkTicker,
    ]
    const result = await this.pricesService.refresh(tickers, fromDate)
    stats.pricesSaved = result.savedCount
    stats.problems.push(
      ...result.problems.map((problem) => ({ ...problem, step: 'Prices' })),
    )
  }

  private async companiesFor(options: RunOptions): Promise<Company[]> {
    const companies = await this.companiesService.listWatched()
    if (!options.companyIds) {
      return companies
    }
    const wanted = new Set(options.companyIds)
    return companies.filter((company) => wanted.has(company.id))
  }

  private async hasPendingBackfill(): Promise<boolean> {
    const companies = await this.companiesService.listWatched()
    for (const source of this.sourceRegistry.configured()) {
      for (const company of companies) {
        if (await this.callSyncService.needsBackfill(source, company.id)) {
          return true
        }
      }
    }
    return false
  }

  private summary(stats: RunStats): Record<string, number> {
    return {
      companyCount: stats.companyCount,
      callsSaved: stats.callsSaved,
      sourceRequests: stats.sourceRequests,
      outcomesSaved: stats.outcomesSaved,
      snapshotsSaved: stats.snapshotsSaved,
      problemCount: stats.problems.length,
    }
  }
}
