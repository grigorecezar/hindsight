'use client'

import { useActionState } from 'react'
import { addCompany } from '@/app/actions'
import type { FormState } from '@/app/_types/FormState'

const INITIAL_STATE: FormState = { message: null, isError: false }

export function AddCompanyForm() {
  const [state, formAction, isPending] = useActionState(
    addCompany,
    INITIAL_STATE,
  )

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="ticker" className="sr-only">
          Ticker
        </label>
        <input
          id="ticker"
          name="ticker"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="Add a ticker, like AAPL"
          className="h-10 w-64 max-w-full rounded-md bg-paper px-3 text-sm uppercase ring-1 ring-ink/15 placeholder:text-ink/40 placeholder:normal-case focus:ring-2 focus:ring-ink/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-md bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? 'Adding' : 'Add'}
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
