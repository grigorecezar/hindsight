import { getConfig } from './config/getConfig'
import type { AppConfig } from './config/types/AppConfig'
import { getDb, getSql } from './db/client'
import { AccuracyService } from './modules/analytics/services/AccuracyService'
import { AuthorListService } from './modules/analytics/services/AuthorListService'
import { AuthorReportService } from './modules/analytics/services/AuthorReportService'
import { AuthorsService } from './modules/authors/services/AuthorsService'
import { CompanyReportService } from './modules/analytics/services/CompanyReportService'
import { ConsensusService } from './modules/analytics/services/ConsensusService'
import { WatchlistService } from './modules/analytics/services/WatchlistService'
import { CallsService } from './modules/calls/services/CallsService'
import { CallSyncService } from './modules/calls/services/CallSyncService'
import { CompaniesService } from './modules/companies/services/CompaniesService'
import { OutcomesService } from './modules/outcomes/services/OutcomesService'
import { YahooMarketDataProvider } from './modules/prices/providers/YahooMarketDataProvider'
import { PricesService } from './modules/prices/services/PricesService'
import { JobLock } from './modules/runs/services/JobLock'
import { JobRunner } from './modules/runs/services/JobRunner'
import { RunsService } from './modules/runs/services/RunsService'
import { BrowserSyncService } from './modules/sources/seeking-alpha/services/BrowserSyncService'
import { SourceRegistry } from './modules/sources/services/SourceRegistry'

export interface Services {
  config: AppConfig
  sourceRegistry: SourceRegistry
  companiesService: CompaniesService
  authorsService: AuthorsService
  callsService: CallsService
  callSyncService: CallSyncService
  browserSyncService: BrowserSyncService
  pricesService: PricesService
  outcomesService: OutcomesService
  accuracyService: AccuracyService
  consensusService: ConsensusService
  companyReportService: CompanyReportService
  authorReportService: AuthorReportService
  authorListService: AuthorListService
  watchlistService: WatchlistService
  runsService: RunsService
  jobRunner: JobRunner
}

let services: Services | null = null

/**
 * Builds every service once per process, on first use. They hold no state
 * of their own beyond the database pool, so one set per process is safe.
 */
export function getServices(): Services {
  if (services) {
    return services
  }

  const config = getConfig()
  const db = getDb()
  const scoring = {
    benchmarkTicker: config.BENCHMARK_TICKER,
    targetMove: config.TARGET_MOVE,
  }

  // Sources a run pulls from. Seeking Alpha is not one: its calls are pushed
  // in by the browser extension (BrowserSyncService). Add pull sources here
  // (see SOURCES-README.md).
  const sourceRegistry = new SourceRegistry([])

  // Storage and scoring.
  const marketDataProvider = new YahooMarketDataProvider()
  const companiesService = new CompaniesService(db, marketDataProvider)
  const callsService = new CallsService(db)
  const callSyncService = new CallSyncService(db, callsService, {
    historyDays: config.BACKFILL_DAYS,
    resyncDays: config.RESYNC_DAYS,
  })
  const authorsService = new AuthorsService(db)
  const browserSyncService = new BrowserSyncService(
    companiesService,
    authorsService,
    callsService,
    callSyncService,
  )
  const pricesService = new PricesService(db, marketDataProvider)
  const outcomesService = new OutcomesService(
    db,
    callsService,
    pricesService,
    scoring,
  )

  // Reads for the pages.
  const accuracyService = new AccuracyService(callsService, outcomesService)
  const consensusService = new ConsensusService(
    db,
    callsService,
    outcomesService,
    pricesService,
    scoring,
  )
  const companyReportService = new CompanyReportService(
    callsService,
    outcomesService,
    pricesService,
    accuracyService,
    consensusService,
    scoring,
  )
  const authorReportService = new AuthorReportService(
    callsService,
    outcomesService,
    pricesService,
    callSyncService,
    scoring,
  )
  const authorListService = new AuthorListService(
    accuracyService,
    authorsService,
  )
  const watchlistService = new WatchlistService(
    companiesService,
    callsService,
    callSyncService,
    pricesService,
  )

  // Jobs.
  const runsService = new RunsService(db)
  const jobRunner = new JobRunner(
    new JobLock(getSql()),
    runsService,
    companiesService,
    sourceRegistry,
    callSyncService,
    callsService,
    pricesService,
    outcomesService,
    consensusService,
    {
      benchmarkTicker: config.BENCHMARK_TICKER,
      backfillDays: config.BACKFILL_DAYS,
    },
  )

  services = {
    config,
    sourceRegistry,
    companiesService,
    authorsService,
    callsService,
    callSyncService,
    browserSyncService,
    pricesService,
    outcomesService,
    accuracyService,
    consensusService,
    companyReportService,
    authorReportService,
    authorListService,
    watchlistService,
    runsService,
    jobRunner,
  }
  return services
}
