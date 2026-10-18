import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { AutoRefresh } from '@/components/runs/AutoRefresh'
import { RunButton } from '@/components/runs/RunButton'
import { RunsTable } from '@/components/runs/RunsTable'
import { SyncNotice } from '@/components/site/SyncNotice'
import { Container } from '@/components/ui/Container'
import { Loading } from '@/components/ui/Loading'
import { PageTitle } from '@/components/ui/PageTitle'
import { Section } from '@/components/ui/Section'
import { RunKind } from '@/server/modules/runs/enums/RunKind'
import { getServices } from '@/server/services'

export const metadata: Metadata = { title: 'Runs' }

export default function RunsPage() {
  return (
    <Container>
      <PageTitle
        title="Runs"
        lede="Calls come in from the Hindsight extension when you click Sync. A daily schedule then rescores everything as prices move and horizons pass."
      />
      <Suspense fallback={<Loading />}>
        <RunsContent />
      </Suspense>
    </Container>
  )
}

async function RunsContent() {
  await connection()
  const { runsService } = getServices()
  const [runs, current] = await Promise.all([
    runsService.recent(),
    runsService.current(),
  ])

  return (
    <>
      <SyncNotice />
      {current ? <AutoRefresh /> : null}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <RunButton
          kind={RunKind.REFRESH}
          label="Rescore only"
          description="Prices and scores from what is stored. Reads nothing from Seeking Alpha."
        />
      </div>
      <Section title="Recent runs" className="mt-14">
        {runs.length > 0 ? (
          <RunsTable runs={runs} />
        ) : (
          <p className="font-serif text-[1.0625rem] text-ink/75">
            No runs yet.
          </p>
        )}
      </Section>
    </>
  )
}
