import type { CompanyProfile } from './CompanyProfile'
import type { DailyClose } from './DailyClose'

/**
 * Where prices come from. Kept apart from the call sources so prices can be
 * swapped (or paid for) without touching how calls are read.
 */
export interface MarketDataProvider {
  // Daily closes from `fromDate` to today, oldest first.
  fetchDailyCloses(ticker: string, fromDate: string): Promise<DailyClose[]>
  // Null when the provider does not know the ticker.
  lookupCompany(ticker: string): Promise<CompanyProfile | null>
}
