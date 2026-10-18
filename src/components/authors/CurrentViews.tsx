import Link from 'next/link'
import { RatingBadge } from '@/components/calls/RatingBadge'
import { Num } from '@/components/ui/Num'
import { Table, Td, Th } from '@/components/ui/Table'
import { formatShortDate } from '@/lib/format/formatDate'
import { formatPercent } from '@/lib/format/formatPercent'
import { formatPrice } from '@/lib/format/formatPrice'
import type { CallRow } from '@/server/modules/analytics/types/CallRow'
import { RATINGS_BULLISH_FIRST } from '@/server/modules/calls/constants/RATINGS_BULLISH_FIRST'

/** An author's latest call on each company, grouped Strong Buy to Strong Sell. */
export function CurrentViews({ views }: { views: CallRow[] }) {
  const ordered = RATINGS_BULLISH_FIRST.flatMap((rating) =>
    views.filter((view) => view.rating === rating),
  )

  return (
    <Table caption="Latest rating on each company">
      <thead>
        <tr>
          <Th>Rating</Th>
          <Th>Company</Th>
          <Th>Since</Th>
          <Th align="right">Price at call</Th>
          <Th align="right">Return so far</Th>
          <Th align="right">vs S&amp;P</Th>
          <Th>Article</Th>
        </tr>
      </thead>
      <tbody>
        {ordered.map((view) => (
          <tr key={view.id}>
            <Td className="whitespace-nowrap">
              <RatingBadge rating={view.rating} />
            </Td>
            <Td>
              <Link
                href={`/companies/${view.ticker}`}
                className="font-medium hover:underline"
              >
                {view.ticker}
              </Link>
              {view.companyName ? (
                <span className="mt-0.5 block max-w-[14rem] truncate text-ink/65">
                  {view.companyName}
                </span>
              ) : null}
            </Td>
            <Td className="whitespace-nowrap">
              {formatShortDate(view.publishedAt)}
            </Td>
            <Td align="right">
              <Num>{formatPrice(view.entryPrice)}</Num>
            </Td>
            <Td align="right">
              <Num>{formatPercent(view.sinceEntry?.stockReturn)}</Num>
            </Td>
            <Td align="right">
              <Num>{formatPercent(view.sinceEntry?.excessReturn)}</Num>
            </Td>
            <Td className="min-w-[14rem]">
              {view.url ? (
                <a
                  href={view.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group inline-flex items-baseline gap-1 text-ink/75 hover:text-ink"
                >
                  <span className="line-clamp-2">
                    {view.title ?? 'Read the article'}
                  </span>
                  <span
                    aria-hidden
                    className="text-ink/40 group-hover:text-ink"
                  >
                    ↗
                  </span>
                </a>
              ) : (
                <span className="text-ink/75">{view.title}</span>
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
