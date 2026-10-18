import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { AccuracyGrid } from '@/components/accuracy/AccuracyGrid'
import { CorrelationStrip } from '@/components/accuracy/CorrelationStrip'
import { ModelScoreTable } from '@/components/accuracy/ModelScoreTable'
import { TimingTable } from '@/components/accuracy/TimingTable'
import { Container } from '@/components/ui/Container'
import { Loading } from '@/components/ui/Loading'
import { PageTitle } from '@/components/ui/PageTitle'
import { Section } from '@/components/ui/Section'
import { formatPercent } from '@/lib/format/formatPercent'
import { getServices } from '@/server/services'

export const metadata: Metadata = { title: 'Accuracy' }

export default function AccuracyPage() {
  return (
    <Container>
      <PageTitle
        title="Who was right, and how long it took."
        lede="Every call on every company you follow, scored against the S&P 500. Old calls are scored as soon as they are pulled in, so there is no waiting for history to build up."
      />
      <Suspense fallback={<Loading />}>
        <AccuracyContent />
      </Suspense>
    </Container>
  )
}

async function AccuracyContent() {
  await connection()
  const { accuracyService, consensusService, config } = getServices()
  const [report, modelScores] = await Promise.all([
    accuracyService.report(),
    consensusService.scoreModel(),
  ])
  const move = formatPercent(config.TARGET_MOVE, { isSigned: false, digits: 0 })

  return (
    <>
      <p className="mb-12 text-sm text-ink/65">
        {report.callCount} calls stored, {report.scoredCallCount} old enough to
        score at 1 month or more.
      </p>

      <Section
        index="01"
        label="By rating"
        title="How often each rating was right"
        note="A buy is right when the stock beat the S&P 500 over the horizon, a sell when it lagged. A hold is right when the stock stayed within 5% of the index over a month, a band that widens with time (about 9% at 3 months, 17% at 12)."
      >
        <AccuracyGrid grid={report.grid} />
      </Section>

      <Section
        index="02"
        label="Conviction"
        title="Do stronger ratings mean bigger moves?"
        note="Rank correlation between rating and excess return. Above zero means Strong Buys did better than Buys, Buys better than Holds, and so on. For stock picking, anything steadily above 0.05 is worth having."
      >
        <CorrelationStrip correlations={report.correlations} />
      </Section>

      <Section
        index="03"
        label="Timing"
        title="How fast calls pay off, and how bumpy the ride is"
        note={`The share of calls that moved ${move} their way within each horizon, and the share that moved ${move} against them. Typical wait is the median days to that move. Swing is the median best and worst point in the first 3 months.`}
      >
        <TimingTable grid={report.grid} targetMove={config.TARGET_MOVE} />
      </Section>

      <Section
        index="04"
        label="The model"
        title="Is the consensus any good?"
        note="The consensus is rebuilt for every month end using only what was known that day, then scored like a call. If buy consensus beats sell consensus here, the blend is worth following."
      >
        <ModelScoreTable scores={modelScores} />
      </Section>

      <Section index="05" label="Method" title="How calls are scored">
        <div className="max-w-[42rem] space-y-4 font-serif text-[1.0625rem] leading-[1.65] text-ink/75">
          <p>
            A call enters at the first close a reader could have traded: the
            same day if the article went out before 4pm New York time, otherwise
            the next trading day. Returns use adjusted closes, so splits and
            dividends are not mistaken for moves.
          </p>
          <p>
            Each horizon ends at the first close on or after the same date 1, 2,
            3, 6 or 12 months later. A call is only scored once that date has
            passed. Excess return is the stock&rsquo;s return minus the S&amp;P
            500&rsquo;s (SPY) over the same days.
          </p>
          <p>
            An author&rsquo;s edge is their average excess return in the
            direction of their calls at 3 months, so a sell that lagged the
            market by 4% counts as +4%. It is shrunk toward zero as if they had
            made 10 more calls with no edge, then turned into a weight from
            0.25× to 3×.
          </p>
          <p>
            The consensus takes each author&rsquo;s latest call from the last
            180 days. A call&rsquo;s weight halves every 60 days and is
            multiplied by its author&rsquo;s weight. Expected returns are what
            calls of each rating did in the past, pulled toward the market when
            there are few of them.
          </p>
          <p>
            One caveat: articles that were deleted from the source are not in
            the history, so the record may flatter authors a little.
          </p>
        </div>
      </Section>
    </>
  )
}
