'use client'

import { useMemo, useState } from 'react'
import { AuthorTable } from '@/components/accuracy/AuthorTable'
import type { AuthorListRow } from '@/server/modules/analytics/types/AuthorListRow'

/**
 * The author table with a search box. Filters as you type, on the name and
 * the profile slug, every word in any order, ignoring case and accents.
 */
export function AuthorSearchTable({ rows }: { rows: AuthorListRow[] }) {
  const [query, setQuery] = useState('')
  const searchable = useMemo(
    () =>
      rows.map((row) => ({ row, text: normalize(`${row.name} ${row.slug}`) })),
    [rows],
  )
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const matches = words.length
    ? searchable
        .filter(({ text }) => words.every((word) => text.includes(word)))
        .map(({ row }) => row)
    : rows

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="author-search" className="sr-only">
          Search authors
        </label>
        <input
          id="author-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search authors"
          autoComplete="off"
          spellCheck={false}
          className="h-9 w-72 max-w-full rounded-md bg-paper px-3 text-sm ring-1 ring-ink/15 placeholder:text-ink/40 focus:ring-2 focus:ring-ink/60 focus:outline-none"
        />
        {words.length > 0 ? (
          <span className="text-sm text-ink/65">
            {matches.length} of {rows.length}{' '}
            {rows.length === 1 ? 'author' : 'authors'}
          </span>
        ) : null}
      </div>
      {matches.length > 0 ? (
        <AuthorTable rows={matches} />
      ) : (
        <p className="font-serif text-[1.0625rem] text-ink/75">
          No author here matches “{query.trim()}”. To add someone new, paste
          their profile link above.
        </p>
      )}
    </div>
  )
}

/** Lowercase, without accents: "Dmytro Lébid" matches "lebid". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}
