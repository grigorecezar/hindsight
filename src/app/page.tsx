import { connection } from 'next/server'
import { Suspense } from 'react'
import { AddCompanyForm } from '@/components/companies/AddCompanyForm'
import { WatchlistTable } from '@/components/companies/WatchlistTable'
import { SyncNotice } from '@/components/site/SyncNotice'
import { Container } from '@/components/ui/Container'
import { Loading } from '@/components/ui/Loading'
import { PageTitle } from '@/components/ui/PageTitle'
import { getServices } from '@/server/services'

export default function HomePage() {
  return (
    <Container>
      <PageTitle
        title="What the analysts said, and what the stock did next."
        lede="Every rated article on the companies you follow, scored against the S&P 500 over 1, 2, 3, 6 and 12 months. The consensus blends the latest calls, weighted by each author’s track record."
      />
      <Suspense fallback={<Loading />}>
        <Watchlist />
      </Suspense>
    </Container>
  )
}

async function Watchlist() {
  await connection()
  const rows = await getServices().watchlistService.rows()

  return (
    <>
      <SyncNotice />
      <div className="mb-6">
        <AddCompanyForm />
      </div>
      {rows.length > 0 ? (
        <WatchlistTable rows={rows} />
      ) : (
        <p className="font-serif text-[1.0625rem] text-ink/75">
          No companies yet. Add a ticker and its last three years of calls are
          pulled in and scored right away.
        </p>
      )}
    </>
  )
}
