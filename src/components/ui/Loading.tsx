/** Fallback while a section's data streams in. */
export function Loading({ label = 'Loading' }: { label?: string }) {
  return <p className="py-10 text-sm text-ink/65">{label}…</p>
}
