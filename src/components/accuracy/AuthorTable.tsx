import Link from 'next/link'
import { FavoriteButton } from '@/components/authors/FavoriteButton'
import { Num } from '@/components/ui/Num'
import { Table, Td, Th } from '@/components/ui/Table'
import { formatShortDate } from '@/lib/format/formatDate'
import { formatPercent } from '@/lib/format/formatPercent'
import { formatRate } from '@/lib/format/formatRate'
import type { AuthorListRow } from '@/server/modules/analytics/types/AuthorListRow'

/** Authors with their scored calls, edge and the weight it earns them. */
export function AuthorTable({
  rows,
  showCompanies = true,
}: {
  rows: AuthorListRow[]
  showCompanies?: boolean
}) {
  return (
    <Table caption="Author track records">
      <thead>
        <tr>
          <Th>
            <span className="sr-only">Favorite</span>
          </Th>
          <Th>Author</Th>
          <Th align="right">Calls</Th>
          {showCompanies ? <Th align="right">Companies</Th> : null}
          <Th align="right">Scored</Th>
          <Th align="right">Hit rate</Th>
          <Th align="right">Edge vs S&amp;P</Th>
          <Th align="right">Weight</Th>
          <Th align="right">Last call</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.authorId}>
            <Td className="w-8 pr-0">
              <FavoriteButton
                authorId={row.authorId}
                authorName={row.name}
                isFavorite={row.isFavorite}
              />
            </Td>
            <Td>
              <Link
                href={`/authors/${row.slug}`}
                className="font-medium hover:underline"
              >
                {row.name}
              </Link>
              {row.isFollowed ? (
                <span className="ml-2 text-[12px] text-ink/65">Following</span>
              ) : null}
              {row.url ? (
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${row.name} on Seeking Alpha`}
                  className="ml-2 text-ink/40 hover:text-ink"
                >
                  ↗
                </a>
              ) : null}
            </Td>
            <Td align="right">
              <Num>{row.record?.callCount ?? ''}</Num>
            </Td>
            {showCompanies ? (
              <Td align="right">
                <Num>{row.record?.companyCount ?? ''}</Num>
              </Td>
            ) : null}
            <Td align="right">
              <Num>{row.record?.scoredCount ?? ''}</Num>
            </Td>
            <Td align="right">
              <Num>{formatRate(row.record?.hitRate)}</Num>
            </Td>
            <Td align="right">
              <Num>{formatPercent(row.record?.meanEdge)}</Num>
            </Td>
            <Td align="right">
              <Num>{row.record ? `${row.record.weight.toFixed(2)}×` : ''}</Num>
            </Td>
            <Td align="right" className="whitespace-nowrap">
              {row.record ? (
                formatShortDate(row.record.lastCallAt)
              ) : (
                <span className="text-ink/65">Waiting for a sync</span>
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
