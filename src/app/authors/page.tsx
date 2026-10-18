import type { Metadata } from 'next'
import Link from 'next/link'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { AuthorSearchTable } from '@/components/authors/AuthorSearchTable'
import { FollowAuthorForm } from '@/components/authors/FollowAuthorForm'
import { Container } from '@/components/ui/Container'
import { Loading } from '@/components/ui/Loading'
import { PageTitle } from '@/components/ui/PageTitle'
import type { AuthorListFilter } from '@/server/modules/analytics/types/AuthorListFilter'
import { getServices } from '@/server/services'

export const metadata: Metadata = { title: 'Authors' }

const FILTERS: { value: AuthorListFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'following', label: 'Following' },
]

export default function AuthorsPage(props: PageProps<'/authors'>) {
  return (
    <Container>
      <PageTitle
        title="The authors worth listening to."
        lede="Ranked by edge: the average return over the S&P 500 in the direction of their calls at 3 months, discounted for authors with few scored calls. Star the ones you trust; follow an author to sync everything they write, not just your watchlist."
      />
      <div className="mb-8">
        <FollowAuthorForm />
      </div>
      <Suspense fallback={<Loading />}>
        <AuthorsContent searchParams={props.searchParams} />
      </Suspense>
    </Container>
  )
}

async function AuthorsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await connection()
  const { show } = await searchParams
  const filter = FILTERS.some((option) => option.value === show)
    ? (show as AuthorListFilter)
    : 'all'
  const rows = await getServices().authorListService.rows(filter)

  return (
    <>
      <nav aria-label="Filter authors" className="mb-4 flex gap-5 text-sm">
        {FILTERS.map((option) => (
          <Link
            key={option.value}
            href={
              option.value === 'all'
                ? '/authors'
                : `/authors?show=${option.value}`
            }
            aria-current={option.value === filter ? 'page' : undefined}
            className={
              option.value === filter
                ? 'text-ink underline underline-offset-4'
                : 'text-ink/65 hover:text-ink'
            }
          >
            {option.label}
          </Link>
        ))}
      </nav>
      {rows.length > 0 ? (
        <AuthorSearchTable rows={rows} />
      ) : (
        <p className="font-serif text-[1.0625rem] text-ink/75">
          {emptyText(filter)}
        </p>
      )}
    </>
  )
}

function emptyText(filter: AuthorListFilter): string {
  if (filter === 'favorites') {
    return 'No favorites yet. Star an author to keep them at the top.'
  }
  if (filter === 'following') {
    return 'You do not follow anyone yet. Paste an author link above.'
  }
  return 'No authors yet. They arrive with the first sync.'
}
