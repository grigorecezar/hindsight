import Link from 'next/link'
import { RatingBadge } from '@/components/calls/RatingBadge'
import { Num } from '@/components/ui/Num'
import { Table, Td, Th } from '@/components/ui/Table'
import { formatShortDate } from '@/lib/format/formatDate'
import { formatPercent } from '@/lib/format/formatPercent'
import { formatPrice } from '@/lib/format/formatPrice'
import type { CallOutcome } from '@/server/modules/analytics/types/CallOutcome'
import type { CallRow } from '@/server/modules/analytics/types/CallRow'
import { HORIZONS } from '@/server/modules/outcomes/constants/HORIZONS'

/**
 * Every call on a company, newest first, with its excess return over the
 * S&P at each horizon once the horizon has passed.
 */
export function CallsTable({
  calls,
  subject = 'company',
}: {
  calls: CallRow[]
  // On a company page each row names its author; on an author page, its company.
  subject?: 'company' | 'author'
}) {
  return (
    <Table caption="Calls with their excess return over the S&P 500 by horizon">
      <thead>
        <tr>
          <Th>Published</Th>
          <Th>Rating</Th>
          <Th>
            {subject === 'company'
              ? 'Author and article'
              : 'Company and article'}
          </Th>
          <Th align="right">Price at call</Th>
          {HORIZONS.map((definition) => (
            <Th key={definition.horizon} align="right">
              {definition.shortLabel}
            </Th>
          ))}
          <Th align="right">So far</Th>
        </tr>
      </thead>
      <tbody>
        {calls.map((call) => (
          <tr key={call.id}>
            <Td className="whitespace-nowrap">
              {formatShortDate(call.publishedAt)}
            </Td>
            <Td className="whitespace-nowrap">
              <RatingBadge rating={call.rating} />
            </Td>
            <Td className="min-w-[13rem]">
              <span className="block font-medium">
                {subject === 'company' ? (
                  <AuthorName call={call} />
                ) : (
                  <CompanyName call={call} />
                )}
              </span>
              {call.url ? (
                <a
                  href={call.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group mt-0.5 inline-flex items-baseline gap-1 text-ink/75 hover:text-ink"
                >
                  <span className="line-clamp-2">
                    {call.title ?? 'Read the article'}
                  </span>
                  <span
                    aria-hidden
                    className="text-ink/40 group-hover:text-ink"
                  >
                    ↗
                  </span>
                </a>
              ) : (
                <span className="mt-0.5 block text-ink/75">{call.title}</span>
              )}
            </Td>
            <Td align="right">
              <Num>{formatPrice(call.entryPrice)}</Num>
              {call.entryDate ? (
                <span className="block text-[12px] text-ink/65 whitespace-nowrap">
                  {formatShortDate(call.entryDate)}
                </span>
              ) : null}
            </Td>
            {HORIZONS.map(({ horizon }) => (
              <Td key={horizon} align="right">
                <OutcomeCell outcome={call.outcomes[horizon]} />
              </Td>
            ))}
            <Td align="right">
              <Num>{formatPercent(call.sinceEntry?.excessReturn)}</Num>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

/** Excess return, with a check or cross for whether the call was right. */
function OutcomeCell({ outcome }: { outcome: CallOutcome | undefined }) {
  if (!outcome) {
    return <Num>{''}</Num>
  }
  return (
    <span className="inline-flex items-baseline gap-1.5 whitespace-nowrap tabular-nums">
      {formatPercent(outcome.excessReturn)}
      <span
        aria-label={outcome.isHit ? 'right' : 'wrong'}
        className={outcome.isHit ? 'text-ink' : 'text-ink/40'}
      >
        {outcome.isHit ? '✓' : '✗'}
      </span>
    </span>
  )
}

function AuthorName({ call }: { call: CallRow }) {
  if (!call.authorSlug) {
    return <>{call.authorName ?? 'Unknown author'}</>
  }
  return (
    <Link href={`/authors/${call.authorSlug}`} className="hover:underline">
      {call.authorName ?? call.authorSlug}
    </Link>
  )
}

function CompanyName({ call }: { call: CallRow }) {
  return (
    <>
      <Link href={`/companies/${call.ticker}`} className="hover:underline">
        {call.ticker}
      </Link>
      {call.companyName ? (
        <span className="ml-2 font-normal text-ink/65">{call.companyName}</span>
      ) : null}
    </>
  )
}
