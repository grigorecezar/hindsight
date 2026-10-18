'use client'

import Link from 'next/link'
import { useState } from 'react'
import { RatingBadge } from '@/components/calls/RatingBadge'
import { RatingMix } from '@/components/periods/RatingMix'
import { Plane } from '@/components/ui/Plane'
import { formatShortDate } from '@/lib/format/formatDate'
import { formatScore } from '@/lib/format/formatScore'
import type { WindowConsensus } from '@/server/modules/analytics/types/WindowConsensus'
import { ratingLabel } from '@/server/modules/calls/utils/ratingLabel'
import { ConsensusScale } from './ConsensusScale'

/**
 * What authors think over the last 1, 3, 6 or 12 months. Each tab carries
 * its own reading, so a shift (Buy over six months, Hold this month) shows
 * before anything is clicked.
 */
export function ConsensusWindows({
  windows,
  defaultMonths,
}: {
  windows: WindowConsensus[]
  defaultMonths: number
}) {
  const [months, setMonths] = useState(defaultMonths)
  const selected =
    windows.find((window) => window.months === months) ?? windows[0]

  return (
    <Plane className="px-5 py-6 sm:px-7">
      <div
        role="tablist"
        aria-label="Time window"
        className="flex flex-wrap gap-2"
      >
        {windows.map((window) => {
          const isSelected = window.months === selected.months
          return (
            <button
              key={window.months}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setMonths(window.months)}
              className={`rounded-md px-3 py-2 text-left text-sm ring-1 transition-colors ${
                isSelected
                  ? 'bg-ink text-paper ring-ink'
                  : 'ring-ink/15 hover:bg-ink/[0.04]'
              }`}
            >
              <span className="block">Last {windowLabel(window.months)}</span>
              <span
                className={`block text-[12px] tabular-nums ${isSelected ? 'text-paper/80' : 'text-ink/65'}`}
              >
                {window.rating
                  ? `${ratingLabel(window.rating)} ${formatScore(window.score)}`
                  : 'No calls'}
              </span>
            </button>
          )
        })}
      </div>

      {selected.rating && selected.score !== null ? (
        <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-[12px] tracking-[0.14em] text-ink/65 uppercase">
                Authors lean
              </p>
              <div className="mt-2">
                <RatingBadge rating={selected.rating} size="lg" />
              </div>
              <p className="mt-2 text-sm text-ink/75 tabular-nums">
                {formatScore(selected.score)} on the scale
              </p>
            </div>
            <ConsensusScale score={selected.score} />
          </div>

          <p className="mt-6 max-w-[46rem] font-serif text-[1.0625rem] leading-[1.65] text-ink/75">
            The latest rating from each of the {selected.authorCount}{' '}
            {selected.authorCount === 1 ? 'author' : 'authors'} who wrote since{' '}
            {formatShortDate(selected.since)}, each counted once, with Strong
            Sell as −2 up to Strong Buy as +2. Only what authors said; the stock
            price plays no part in it.
          </p>
          <div className="mt-4 max-w-[34rem]">
            <RatingMix mix={selected.mix} />
          </div>

          <details className="mt-5 border-t border-ink/10 pt-4">
            <summary className="cursor-pointer text-sm text-ink/75 hover:text-ink">
              Who is in it ({selected.authorCount})
            </summary>
            <ul className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
              {selected.views.map((view) => (
                <li
                  key={view.callId}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="min-w-0 truncate">
                    <RatingBadge rating={view.rating} />
                    {view.authorSlug ? (
                      <Link
                        href={`/authors/${view.authorSlug}`}
                        className="ml-2 text-ink/75 hover:text-ink hover:underline"
                      >
                        {view.authorName ?? view.authorSlug}
                      </Link>
                    ) : (
                      <span className="ml-2 text-ink/75">
                        {view.authorName ?? 'Unknown author'}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-ink/65 tabular-nums">
                    {formatShortDate(view.publishedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <p className="mt-6 font-serif text-[1.0625rem] text-ink/75">
          Nobody wrote a rated article in the last{' '}
          {windowLabel(selected.months)}.
        </p>
      )}
    </Plane>
  )
}

function windowLabel(months: number): string {
  return months === 1 ? 'month' : `${months} months`
}
