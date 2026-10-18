'use client'

import { useActionState } from 'react'
import { followAuthor } from '@/app/actions'
import type { FormState } from '@/app/_types/FormState'

const INITIAL_STATE: FormState = { message: null, isError: false }

export function FollowAuthorForm() {
  const [state, formAction, isPending] = useActionState(
    followAuthor,
    INITIAL_STATE,
  )

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="author" className="sr-only">
          Author link or username
        </label>
        <input
          id="author"
          name="author"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="Paste an author link, like seekingalpha.com/author/…"
          className="h-10 w-[26rem] max-w-full rounded-md bg-paper px-3 text-sm ring-1 ring-ink/15 placeholder:text-ink/40 focus:ring-2 focus:ring-ink/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-md bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? 'Following' : 'Follow'}
        </button>
      </div>
      {state.message ? (
        <p
          role="status"
          className={`text-sm ${state.isError ? 'text-ink' : 'text-ink/75'}`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
