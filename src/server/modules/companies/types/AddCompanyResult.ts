import type { Company } from './Company'

export interface AddCompanyResult {
  company: Company
  // False when the ticker was already on the watchlist.
  isNew: boolean
}
