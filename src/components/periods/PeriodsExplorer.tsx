'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { RatingBadge } from '@/components/calls/RatingBadge'
import { Plane } from '@/components/ui/Plane'
import { formatShortDate } from '@/lib/format/formatDate'
import { formatPercent } from '@/lib/format/formatPercent'
import { formatPrice } from '@/lib/format/formatPrice'
import { formatScore } from '@/lib/format/formatScore'
import { describePeriod, inDays } from '@/lib/periods/describePeriod'
import type { CallRow } from '@/server/modules/analytics/types/CallRow'
import type { ChartMarker } from '@/server/modules/analytics/types/ChartMarker'
import type { ChartPoint } from '@/server/modules/analytics/types/ChartPoint'
import type { PeriodHistory } from '@/server/modules/analytics/types/PeriodHistory'
import type { PricePeriod } from '@/server/modules/analytics/types/PricePeriod'
import { PeriodsChart } from './PeriodsChart'
import { RatingMix } from './RatingMix'

/**
 * The stock's history in periods, and for each one what the authors said
 * and what the stock did next. Chart, the selected period, then every
 * period in a table; selecting in one selects in the others.
 */
export function PeriodsExplorer({
  ticker,
  points,
  markers,
  history,
  calls,
}: {
  ticker: string
  points: ChartPoint[]
  markers: ChartMarker[]
  history: PeriodHistory
  calls: CallRow[]
}) {
  const { periods, band } = history
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() =>
    defaultSelection(periods),
  )
  const [isShowingCalls, setIsShowingCalls] = useState(false)
  const chartRef = useRef<HTMLDivElement>(null)
  const callsById = useMemo(
    () => new Map(calls.map((call) => [call.id, call])),
    [calls],
  )
  const selected = selectedIndex === null ? null : periods[selectedIndex]

  const select = (index: number, shouldScroll = false) => {
    setSelectedIndex(index)
    if (shouldScroll) {
      chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div>
      <Headline periods={periods} band={band} />

      <div ref={chartRef} className="scroll-mt-6">
        <Plane className="px-3 pt-4 pb-2 sm:px-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3 px-1 text-[13px] text-ink/75">
            <p>
              <span
                className="mr-2 inline-block h-[2px] w-5 bg-ink/45 align-middle"
                aria-hidden
              />
              Flat period, at its average price
              <span className="mx-3 text-ink/40">·</span>
              Moves labelled with their size
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isShowingCalls}
                onChange={(event) => setIsShowingCalls(event.target.checked)}
                className="accent-[var(--color-ink)]"
              />
              Show each call
            </label>
          </div>
          <PeriodsChart
            points={points}
            periods={periods}
            band={band}
            markers={markers}
            isShowingCalls={isShowingCalls}
            selectedIndex={selectedIndex}
            onSelect={(index) => select(index)}
          />
        </Plane>
      </div>

      {selected ? (
        <PeriodDetail
          period={selected}
          band={band}
          ticker={ticker}
          callsById={callsById}
        />
      ) : null}

      <h3 className="mt-12 mb-4 font-serif text-[1.25rem] font-medium">
        Every period
      </h3>
      <PeriodTable
        periods={periods}
        band={band}
        selectedIndex={selectedIndex}
        onSelect={(index) => select(index, true)}
      />
    </div>
  )
}

/** The most recent period whose verdict is in, so the first read is a finished story. */
function defaultSelection(periods: PricePeriod[]): number | null {
  const index = periods.findLastIndex(
    (period) => period.verdict === 'right' || period.verdict === 'wrong',
  )
  if (index !== -1) {
    return index
  }
  return periods.length > 0 ? periods.length - 1 : null
}

/**
 * The answer up front: before each big move, did the authors lean the right
 * way? A big move is one larger than the stock's flat band.
 */
function Headline({ periods, band }: { periods: PricePeriod[]; band: number }) {
  const judged = periods.filter(
    (period) => period.verdict === 'right' || period.verdict === 'wrong',
  )
  const beforeBigMoves = judged.filter(
    (period) =>
      period.next &&
      period.next.shape !== 'flat' &&
      Math.abs(period.next.change) >= band,
  )
  const rightBeforeBig = beforeBigMoves.filter(
    (period) => period.verdict === 'right',
  ).length
  const right = judged.filter((period) => period.verdict === 'right').length

  if (judged.length === 0) {
    return (
      <p className="mb-6 max-w-[42rem] font-serif text-[1.125rem] leading-[1.6]">
        Not enough history yet to judge what the authors said against what
        happened next.
      </p>
    )
  }

  return (
    <div className="mb-6 max-w-[46rem] font-serif text-[1.125rem] leading-[1.6]">
      {beforeBigMoves.length > 0 ? (
        <p>
          Before the {beforeBigMoves.length} big{' '}
          {beforeBigMoves.length === 1 ? 'move' : 'moves'} (more than{' '}
          {formatPercent(band, { isSigned: false, digits: 0 })}), the authors
          leaned the right way{' '}
          <strong className="font-semibold">
            {rightBeforeBig} {rightBeforeBig === 1 ? 'time' : 'times'}
          </strong>
          .
        </p>
      ) : null}
      <p className="text-ink/75">
        Across every period with calls, what they said matched what the stock
        did next {right} of {judged.length} times.
      </p>
    </div>
  )
}

function PeriodDetail({
  period,
  band,
  ticker,
  callsById,
}: {
  period: PricePeriod
  band: number
  ticker: string
  callsById: Map<string, CallRow>
}) {
  const periodCalls = period.callIds.flatMap((id) => {
    const call = callsById.get(id)
    return call ? [call] : []
  })

  return (
    <Plane className="mt-6 px-5 py-5">
      <p className="text-[11px] tracking-[0.18em] text-ink/65 uppercase">
        {formatShortDate(period.startDate)} to{' '}
        {period.isCurrent ? 'now' : formatShortDate(period.endDate)} ·{' '}
        {period.tradingDays} trading days
      </p>

      <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div>
          <p className="text-[12px] tracking-[0.14em] text-ink/65 uppercase">
            The stock
          </p>
          <p className="mt-1 font-serif text-[1.375rem] leading-tight font-medium">
            {describePeriod(period, band)}
          </p>
          <p className="mt-1 text-sm text-ink/75">
            {formatPrice(period.startPrice)} to {formatPrice(period.endPrice)}
            {period.benchmarkChange !== null
              ? `, while the S&P moved ${formatPercent(period.benchmarkChange)}`
              : ''}
            .
          </p>
        </div>

        <div>
          <p className="text-[12px] tracking-[0.14em] text-ink/65 uppercase">
            What authors said
          </p>
          {period.consensus ? (
            <>
              <div className="mt-1 flex items-baseline gap-2">
                <RatingBadge rating={period.consensus.rating} />
                <span className="text-sm text-ink/75 tabular-nums">
                  {formatScore(period.consensus.score)}
                </span>
              </div>
              <p className="mt-1 mb-2 text-sm text-ink/75">
                The average of {period.consensus.callCount}{' '}
                {period.consensus.callCount === 1 ? 'call' : 'calls'} by{' '}
                {period.consensus.authorCount}{' '}
                {period.consensus.authorCount === 1 ? 'author' : 'authors'}.
              </p>
              <RatingMix mix={period.consensus.mix} />
            </>
          ) : (
            <p className="mt-1 text-sm text-ink/75">
              Nobody wrote a rated article on {ticker} in this period.
            </p>
          )}
        </div>

        <div>
          <p className="text-[12px] tracking-[0.14em] text-ink/65 uppercase">
            What happened next
          </p>
          {period.next ? (
            <>
              <p className="mt-1 font-serif text-[1.375rem] leading-tight font-medium">
                {describePeriod({ ...period.next, level: null }, band)}{' '}
                {period.next.shape === 'flat'
                  ? ''
                  : inDays(period.next.tradingDays)}
              </p>
              <p className="mt-1 text-sm text-ink/75">
                {period.next.benchmarkChange !== null
                  ? `The S&P moved ${formatPercent(period.next.benchmarkChange)}, so ${ticker} did ${formatPercent(period.next.excess)} against it.`
                  : ''}
              </p>
              <Verdict period={period} />
            </>
          ) : (
            <p className="mt-1 text-sm text-ink/75">
              This period is still going. The verdict comes once the next one
              starts.
            </p>
          )}
        </div>
      </div>

      {periodCalls.length > 0 ? (
        <details className="mt-6 border-t border-ink/10 pt-4">
          <summary className="cursor-pointer text-sm text-ink/75 hover:text-ink">
            The {periodCalls.length}{' '}
            {periodCalls.length === 1 ? 'call' : 'calls'} in this period
          </summary>
          <ul className="mt-3 divide-y divide-ink/10 text-sm">
            {periodCalls.map((call) => (
              <li
                key={call.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2"
              >
                <span className="w-24 shrink-0 text-ink/65 tabular-nums">
                  {formatShortDate(call.publishedAt)}
                </span>
                <span className="w-28 shrink-0">
                  <RatingBadge rating={call.rating} />
                </span>
                <span className="w-44 shrink-0 truncate">
                  {call.authorSlug ? (
                    <Link
                      href={`/authors/${call.authorSlug}`}
                      className="hover:underline"
                    >
                      {call.authorName}
                    </Link>
                  ) : (
                    call.authorName
                  )}
                </span>
                {call.url ? (
                  <a
                    href={call.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1 truncate text-ink/75 hover:text-ink"
                  >
                    {call.title}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-ink/75">
                    {call.title}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Plane>
  )
}

function Verdict({ period }: { period: PricePeriod }) {
  if (period.verdict === 'right') {
    return <p className="mt-3 text-sm font-medium">✓ The authors were right.</p>
  }
  if (period.verdict === 'wrong') {
    return <p className="mt-3 text-sm font-medium">✗ The authors were wrong.</p>
  }
  return null
}

function PeriodTable({
  periods,
  band,
  selectedIndex,
  onSelect,
}: {
  periods: PricePeriod[]
  band: number
  selectedIndex: number | null
  onSelect: (index: number) => void
}) {
  const newestFirst = periods
    .map((period, index) => ({ period, index }))
    .reverse()

  return (
    <Plane className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm [&_tbody_tr:last-child_td]:border-b-0">
        <caption className="sr-only">
          Every period, what authors said and what came next
        </caption>
        <thead>
          <tr className="text-[11px] tracking-[0.14em] text-ink/65 uppercase">
            <th
              scope="col"
              className="border-b border-ink/15 py-3 pr-3 pl-4 font-normal"
            >
              Period
            </th>
            <th
              scope="col"
              className="border-b border-ink/15 px-3 py-3 font-normal"
            >
              The stock
            </th>
            <th
              scope="col"
              className="border-b border-ink/15 px-3 py-3 font-normal"
            >
              Authors said
            </th>
            <th
              scope="col"
              className="border-b border-ink/15 px-3 py-3 font-normal"
            >
              Then
            </th>
            <th
              scope="col"
              className="border-b border-ink/15 py-3 pr-4 pl-3 font-normal"
            >
              Verdict
            </th>
          </tr>
        </thead>
        <tbody>
          {newestFirst.map(({ period, index }) => (
            <tr
              key={period.startDate}
              onClick={() => onSelect(index)}
              className={`cursor-pointer align-top transition-colors hover:bg-ink/[0.03] ${index === selectedIndex ? 'bg-ink/[0.06]' : ''}`}
            >
              <td className="border-b border-ink/10 py-3 pr-3 pl-4 whitespace-nowrap">
                <button
                  type="button"
                  className="text-left"
                  onClick={() => onSelect(index)}
                >
                  {formatShortDate(period.startDate)}
                  <span className="block text-[12px] text-ink/65">
                    {period.isCurrent
                      ? 'to now'
                      : `${period.tradingDays} trading days`}
                  </span>
                </button>
              </td>
              <td className="border-b border-ink/10 px-3 py-3">
                {describePeriod(period, band)}
              </td>
              <td className="border-b border-ink/10 px-3 py-3 whitespace-nowrap">
                {period.consensus ? (
                  <>
                    <RatingBadge rating={period.consensus.rating} />
                    <span className="block text-[12px] text-ink/65">
                      {formatScore(period.consensus.score)} from{' '}
                      {period.consensus.callCount}{' '}
                      {period.consensus.callCount === 1 ? 'call' : 'calls'}
                    </span>
                  </>
                ) : (
                  <span className="text-ink/65">No calls</span>
                )}
              </td>
              <td className="border-b border-ink/10 px-3 py-3">
                {period.next ? (
                  <>
                    {describePeriod({ ...period.next, level: null }, band)}
                    {period.next.benchmarkChange !== null ? (
                      <span className="block text-[12px] text-ink/65">
                        {formatPercent(period.next.excess)} against the S&amp;P
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="text-ink/65">Still going</span>
                )}
              </td>
              <td className="border-b border-ink/10 py-3 pr-4 pl-3 whitespace-nowrap">
                {period.verdict === 'right' ? (
                  <span className="font-medium">✓ Right</span>
                ) : null}
                {period.verdict === 'wrong' ? (
                  <span className="text-ink/75">✗ Wrong</span>
                ) : null}
                {period.verdict === 'pending' ? (
                  <span className="text-ink/65">Playing out</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Plane>
  )
}
