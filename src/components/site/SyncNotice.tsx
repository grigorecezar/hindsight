import { Notice } from '@/components/ui/Notice'
import { SourceId } from '@/server/modules/sources/enums/SourceId'
import { getServices } from '@/server/services'

/** Shown while a watched company or followed author has never been synced. */
export async function SyncNotice() {
  const { companiesService, authorsService, callSyncService } = getServices()
  const [companies, authors, companyStates, authorStates] = await Promise.all([
    companiesService.listWatched(),
    authorsService.listFollowed(),
    callSyncService.listStates(),
    callSyncService.listAuthorStates(),
  ])
  const isCovered = (state: { source: string; coveredFrom: Date | null }) =>
    state.source === SourceId.SEEKING_ALPHA && Boolean(state.coveredFrom)
  const syncedCompanyIds = new Set(
    companyStates.filter(isCovered).map((state) => state.companyId),
  )
  const syncedAuthorIds = new Set(
    authorStates.filter(isCovered).map((state) => state.authorId),
  )
  const waiting = [
    ...companies
      .filter((company) => !syncedCompanyIds.has(company.id))
      .map((company) => company.ticker),
    ...authors
      .filter((author) => !syncedAuthorIds.has(author.id))
      .map((author) => author.name),
  ]
  if (waiting.length === 0) {
    return null
  }

  return (
    <Notice title={`Waiting for a sync: ${waiting.join(', ')}.`}>
      Log in to Seeking Alpha in Chrome, open the Hindsight extension and click
      Sync. The first sync pulls the history; after that, only what is new.
      Setup is in{' '}
      <code className="font-mono text-[0.85em]">extension/README.md</code>.
    </Notice>
  )
}
