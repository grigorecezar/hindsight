import Link from 'next/link'
import { RatingBadge } from '@/components/calls/RatingBadge'
import { RatingMark } from '@/components/calls/RatingMark'
import { Num } from '@/components/ui/Num'
import { Table, Td, Th } from '@/components/ui/Table'
import { formatPrice } from '@/lib/format/formatPrice'
import { formatScore } from '@/lib/format/formatScore'
import { formatShortDate } from '@/lib/format/formatDate'
import type { WatchlistRow } from '@/server/modules/analytics/types/WatchlistRow'

export function WatchlistTable({ rows }: { rows: WatchlistRow[] }) {
  return (
    <Table caption="Watchlist">
      <thead>
        <tr>
          <Th>Company</Th>
          <Th>Consensus, 3 months</Th>
          <Th align="right">Score</Th>
          <Th align="right">Calls, 90 days</Th>
          <Th>Last call</Th>
          <Th align="right">Price</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.company.id} className="group">
            <Td>
              <Link
                href={`/companies/${row.company.ticker}`}
                className="font-medium hover:underline"
              >
                {row.company.ticker}
              </Link>
              <span className="mt-0.5 block max-w-[16rem] truncate text-ink/65">
                {row.company.name}
              </span>
            </Td>
            <Td>
              {row.consensus.rating ? (
                <RatingBadge rating={row.consensus.rating} />
              ) : (
                <span className="text-ink/65">
                  {row.isSynced ? 'No recent calls' : 'First sync pending'}
                </span>
              )}
            </Td>
            <Td align="right">
              <Num>{formatScore(row.consensus.score)}</Num>
            </Td>
            <Td align="right">
              <Num>{row.recentCallCount}</Num>
            </Td>
            <Td>
              {row.lastCall ? (
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <RatingMark rating={row.lastCall.rating} />
                  {formatShortDate(row.lastCall.publishedAt)}
                </span>
              ) : (
                <Num>{''}</Num>
              )}
            </Td>
            <Td align="right">
              <Num>{formatPrice(row.latestClose?.close)}</Num>
            </Td>
            <Td align="right">
              <Link
                href={`/companies/${row.company.ticker}`}
                aria-label={`Open ${row.company.ticker}`}
                className="text-ink/40 transition-colors group-hover:text-ink"
              >
                →
              </Link>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
