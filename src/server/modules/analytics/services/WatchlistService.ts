import { CallsService } from '../../calls/services/CallsService'
import { CallSyncService } from '../../calls/services/CallSyncService'
import { CompaniesService } from '../../companies/services/CompaniesService'
import { PricesService } from '../../prices/services/PricesService'
import { todayInNewYork } from '@/server/common/utils/todayInNewYork'
import { DEFAULT_CONSENSUS_MONTHS } from '../constants/CONSENSUS_WINDOWS'
import type { WatchlistRow } from '../types/WatchlistRow'
import { windowConsensus } from '../utils/windowConsensus'

/** The home page: every active company with its latest numbers. */
export class WatchlistService {
  // "Recent" calls on the watchlist are the last 90 days.
  private static readonly RECENT_DAYS = 90

  constructor(
    private readonly companiesService: CompaniesService,
    private readonly callsService: CallsService,
    private readonly callSyncService: CallSyncService,
    private readonly pricesService: PricesService,
  ) {}

  public async rows(): Promise<WatchlistRow[]> {
    const companies = await this.companiesService.listWatched()
    const [callRecords, syncStates, latestCloses] = await Promise.all([
      this.callsService.listRecords(),
      this.callSyncService.listStates(),
      this.pricesService.latestCloses(
        companies.map((company) => company.ticker),
      ),
    ])

    const recentSince = Date.now() - WatchlistService.RECENT_DAYS * 86_400_000
    const callsByCompany = Map.groupBy(callRecords, (call) => call.companyId)
    const syncedCompanyIds = new Set(
      syncStates
        .filter((state) => state.backfilledAt)
        .map((state) => state.companyId),
    )

    return companies.map((company) => {
      const companyCalls = callsByCompany.get(company.id) ?? []
      const lastCall = companyCalls.at(-1)
      return {
        company,
        isSynced: syncedCompanyIds.has(company.id),
        consensus: windowConsensus(
          companyCalls,
          todayInNewYork(),
          DEFAULT_CONSENSUS_MONTHS,
        ),
        recentCallCount: companyCalls.filter(
          (call) => call.publishedAt.getTime() >= recentSince,
        ).length,
        lastCall: lastCall
          ? {
              publishedAt: lastCall.publishedAt,
              rating: lastCall.rating,
              authorName: lastCall.authorName,
            }
          : null,
        latestClose: latestCloses.get(company.ticker) ?? null,
      }
    })
  }
}
