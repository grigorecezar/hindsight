import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { followAuthorFromPage, unfollowAuthor } from '@/app/actions'
import { AccuracyGrid } from '@/components/accuracy/AccuracyGrid'
import { FavoriteButton } from '@/components/authors/FavoriteButton'
import { CurrentViews } from '@/components/authors/CurrentViews'
import { StatStrip } from '@/components/authors/StatStrip'
import { CallsTable } from '@/components/calls/CallsTable'
import { Container } from '@/components/ui/Container'
import { Loading } from '@/components/ui/Loading'
import { Notice } from '@/components/ui/Notice'
import { PageTitle } from '@/components/ui/PageTitle'
import { Section } from '@/components/ui/Section'
import { formatDate } from '@/lib/format/formatDate'
import { formatPercent } from '@/lib/format/formatPercent'
import { formatRate } from '@/lib/format/formatRate'
import type { AuthorReport } from '@/server/modules/analytics/types/AuthorReport'
import { getServices } from '@/server/services'

export default function AuthorPage(props: PageProps<'/authors/[slug]'>) {
  return (
    <Container>
      <Suspense fallback={<Loading />}>
        <AuthorContent params={props.params} />
      </Suspense>
    </Container>
  )
}

async function AuthorContent({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  await connection()
  const { slug } = await params
  const { authorsService, authorReportService } = getServices()

  const author = await authorsService.findBySlug(decodeURIComponent(slug))
  if (!author) {
    notFound()
  }
  const report = await authorReportService.build(author)
  const record = report.record
  const companyCount = new Set(report.calls.map((call) => call.companyId)).size
  const firstCall = report.calls.at(-1)

  return (
    <>
      <PageTitle
        eyebrow="Author"
        title={
          <span className="inline-flex items-baseline gap-4">
            {author.name}
            <FavoriteButton
              authorId={author.id}
              authorName={author.name}
              isFavorite={Boolean(author.favoritedAt)}
              size="lg"
            />
          </span>
        }
        lede={
          firstCall
            ? `${report.calls.length} calls on ${companyCount} ${companyCount === 1 ? 'company' : 'companies'} since ${formatDate(firstCall.publishedAt)}, ${report.accuracy.scoredCallCount} of them old enough to score.`
            : 'No calls stored yet.'
        }
      />

      <div className="-mt-6 mb-10 flex flex-wrap items-center gap-4 text-sm">
        <FollowButton report={report} />
        {author.url ? (
          <a
            href={author.url}
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-baseline gap-1 text-ink/65 hover:text-ink"
          >
            Seeking Alpha profile
            <span aria-hidden className="text-ink/40 group-hover:text-ink">
              ↗
            </span>
          </a>
        ) : null}
      </div>

      <SyncState report={report} />

      <StatStrip
        stats={[
          { label: 'Calls', value: record?.callCount ?? report.calls.length },
          {
            label: 'Scored',
            value: record?.scoredCount ?? 0,
            note: 'At 3 months',
          },
          { label: 'Hit rate', value: formatRate(record?.hitRate) || '·' },
          {
            label: 'Edge vs S&P',
            value: formatPercent(record?.meanEdge) || '·',
            note: 'In the direction of the call',
          },
          {
            label: 'Weight',
            value: record ? `${record.weight.toFixed(2)}×` : '·',
            note: 'In the consensus',
          },
        ]}
      />

      <Section
        index="01"
        label="Now"
        title="What they think now"
        note="Their latest rating on each company in the last year, most bullish first. Return so far runs from the first close after the article."
        className="mt-14"
      >
        {report.currentViews.length > 0 ? (
          <CurrentViews views={report.currentViews} />
        ) : (
          <p className="font-serif text-[1.0625rem] text-ink/75">
            No calls in the last year.
          </p>
        )}
      </Section>

      <Section
        index="02"
        label="Accuracy"
        title="How their calls played out"
        note="How often each rating was right, and its average return over the S&P 500."
      >
        <AccuracyGrid grid={report.accuracy.grid} />
      </Section>

      <Section
        index="03"
        label="Calls"
        title="Every call, newest first"
        note="Returns are over the S&P 500. A check means the call was right at that horizon."
      >
        {report.calls.length > 0 ? (
          <CallsTable calls={report.calls} subject="author" />
        ) : (
          <p className="font-serif text-[1.0625rem] text-ink/75">
            Nothing yet.
          </p>
        )}
      </Section>
    </>
  )
}

function FollowButton({ report }: { report: AuthorReport }) {
  const { author } = report
  if (author.followedAt) {
    return (
      <form action={unfollowAuthor}>
        <input type="hidden" name="authorId" value={author.id} />
        <button
          type="submit"
          className="h-9 rounded-md px-3 text-sm ring-1 ring-ink/25 transition-colors hover:bg-paper"
        >
          Following
        </button>
      </form>
    )
  }
  return (
    <form action={followAuthorFromPage}>
      <input type="hidden" name="slug" value={author.externalId} />
      <button
        type="submit"
        className="h-9 rounded-md bg-ink px-3 text-sm text-paper transition-opacity hover:opacity-90"
      >
        Follow
      </button>
    </form>
  )
}

function SyncState({ report }: { report: AuthorReport }) {
  if (report.author.followedAt && !report.isSynced) {
    return (
      <Notice title="Waiting for a sync.">
        Click Sync in the extension to pull everything {report.author.name} has
        written in the history window.
      </Notice>
    )
  }
  if (!report.author.followedAt) {
    return (
      <Notice title="Only their calls on your watchlist so far.">
        Follow {report.author.name} to sync everything they write, across every
        stock.
      </Notice>
    )
  }
  return null
}
