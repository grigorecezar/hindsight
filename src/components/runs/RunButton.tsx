'use client'

import { useFormStatus } from 'react-dom'
import { startRun } from '@/app/actions'
import type { RunKind } from '@/server/modules/runs/enums/RunKind'

export function RunButton({
  kind,
  label,
  description,
}: {
  kind: RunKind
  label: string
  description: string
}) {
  return (
    <form action={startRun} className="flex flex-col gap-2">
      <input type="hidden" name="kind" value={kind} />
      <SubmitButton label={label} />
      <p className="text-[13px] leading-[1.5] text-ink/65">{description}</p>
    </form>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending: isPending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={isPending}
      className="h-10 w-fit rounded-md bg-ink px-4 text-sm text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {isPending ? 'Starting' : label}
    </button>
  )
}
