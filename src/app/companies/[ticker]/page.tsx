import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { unwatchCompany } from '@/app/actions'
import { AccuracyGrid } from '@/components/accuracy/AccuracyGrid'
import { AuthorTable } from '@/components/accuracy/AuthorTable'
import { CallsTable } from '@/components/calls/CallsTable'
import { ConsensusWindows } from '@/components/consensus/ConsensusWindows'
import { PeriodsExplorer } from '@/components/periods/PeriodsExplorer'
import { Container } from '@/components/ui/Container'
import { Loading } from '@/components/ui/Loading'
import { PageTitle } from '@/components/ui/PageTitle'
import { Section } from '@/components/ui/Section'
import { formatDate } from '@/lib/format/formatDate'
import { formatPercent } from '@/lib/format/formatPercent'
import { formatPrice } from '@/lib/format/formatPrice'
import { DEFAULT_CONSENSUS_MONTHS } from '@/server/modules/analytics/constants/CONSENSUS_WINDOWS'
import { getServices } from '@/server/services'

export default function CompanyPage(props: PageProps<'/companies/[ticker]'>) {
  return (
    <Container>
      <Suspense fallback={<Loading />}>
        <CompanyContent params={props.params} />
      </Suspense>
    </Container>
  )
}

async function CompanyContent({
  params,
}: {
  params: Promise<{ ticker: string }>
}) {
  await connection()
  const { ticker } = await params
  const { companiesService, companyReportService, authorListService } =
    getServices()

  const company = await companiesService.findByTicker(
    decodeURIComponent(ticker),
  )
  if (!company) {
    notFound()
  }
  const [report, allAuthors] = await Promise.all([
    companyReportService.build(company),
    authorListService.rows('all'),
  ])
  const coveringIds = new Set(report.authors.map((record) => record.authorId))
  const authorRows = allAuthors.filter((row) => coveringIds.has(row.authorId))
  const lastPoint = report.chartPoints.at(-1)
  const firstCall = report.calls.at(-1)

  return (
    <>
      <PageTitle
        eyebrow={
          <>
            {company.ticker}
            {lastPoint ? (
              <span className="ml-3 normal-case tracking-normal">
                {formatPrice(lastPoint.close)} on {formatDate(lastPoint.date)}
              </span>
            ) : null}
          </>
        }
        title={company.name ?? company.ticker}
        lede={
          firstCall
            ? `${report.accuracy.callCount} calls since ${formatDate(firstCall.publishedAt)}, ${report.accuracy.scoredCallCount} of them old enough to score.`
            : 'No calls stored yet. They arrive with the next sync.'
        }
      />

      <Section index="01" label="Now" title="What the authors think">
        <ConsensusWindows
          windows={report.windows}
          defaultMonths={DEFAULT_CONSENSUS_MONTHS}
        />
      </Section>

      <Section
        index="02"
        label="Periods"
        title="What they said, and what happened next"
        note={`The price is split into periods: flat stretches (where ${company.ticker} held inside a band of about ${formatPercent(report.periods.band, { isSigned: false, digits: 0 })}) and the moves between them. For each period: the average rating of the calls written during it, and what the stock did in the period that followed, against the S&P.`}
      >
        <PeriodsExplorer
          ticker={company.ticker}
          points={report.chartPoints}
          markers={report.chartMarkers}
          history={report.periods}
          calls={report.calls}
        />
      </Section>

      <Section
        index="03"
        label="By rating"
        title="How each rating did"
        note="How often each rating was right, and what acting on it earned over the S&P 500 on average. A buy is right when the stock beat the index, a sell when it lagged, a hold when it stayed close."
      >
        <AccuracyGrid grid={report.accuracy.grid} />
      </Section>

      <Section
        index="04"
        label="Calls"
        title="Every call, newest first"
        note="Returns are over the S&P 500. A check means the call was right at that horizon."
      >
        {report.calls.length > 0 ? (
          <CallsTable calls={report.calls} />
        ) : (
          <p className="font-serif text-[1.0625rem] text-ink/75">
            Nothing yet.
          </p>
        )}
      </Section>

      {authorRows.length > 0 ? (
        <Section
          index="05"
          label="Authors"
          title={`Who covers ${company.ticker}`}
          note="Track records across every company you follow, judged at 3 months."
        >
          <AuthorTable rows={authorRows} />
        </Section>
      ) : null}

      <form action={unwatchCompany} className="mt-16">
        <input type="hidden" name="companyId" value={company.id} />
        <button
          type="submit"
          className="text-sm text-ink/65 underline decoration-ink/30 underline-offset-4 hover:text-ink"
        >
          Stop following {company.ticker}
        </button>
        <span className="ml-2 text-sm text-ink/65">
          Its history stays. Add it again any time.
        </span>
      </form>
    </>
  )
}
