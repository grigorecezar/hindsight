import { describe, expect, it } from 'vitest'
import { entryDateFor } from '@/server/modules/outcomes/utils/entryDateFor'
import { parseListDate } from '@/server/modules/sources/seeking-alpha/utils/parseListDate'

// Sunday, October 18, 2026, mid morning in New York.
const NOW = new Date('2026-10-18T14:00:00Z')
const day = (text: string) =>
  parseListDate(text, NOW)?.toISOString().slice(0, 10)

describe('parseListDate', () => {
  it('reads this year from a weekday and date', () => {
    expect(day('Fri, Oct 16')).toBe('2026-10-16')
    expect(day('Mon, Sep 28')).toBe('2026-09-28')
  })

  it('uses the weekday to find an earlier year', () => {
    // October 2 is a Friday in 2026 and a Thursday in 2025.
    expect(day('Thu, Oct 02')).toBe('2025-10-02')
    expect(day('Fri, Oct 02')).toBe('2026-10-02')
  })

  it('never lands in the future', () => {
    // December 1 is still ahead in 2026, so a bare date means last year.
    expect(day('Dec 01')).toBe('2025-12-01')
  })

  it('reads explicit years and relative dates', () => {
    expect(day('Sep 28, 2024')).toBe('2024-09-28')
    expect(day('Mon, Sep 28, 2026')).toBe('2026-09-28')
    expect(day('Yesterday')).toBe('2026-10-17')
    expect(parseListDate('3 hours ago', NOW)?.toISOString()).toBe(
      '2026-10-18T11:00:00.000Z',
    )
  })

  it('assumes an after close publish, so the entry is the next trading day', () => {
    const published = parseListDate('Fri, Oct 16', NOW)!
    expect(published.toISOString()).toBe('2026-10-16T20:00:00.000Z')
    expect(entryDateFor(published)).toBe('2026-10-17')
  })

  it('returns null for anything else', () => {
    expect(parseListDate('3 Comments', NOW)).toBeNull()
    expect(parseListDate('Editors Pick', NOW)).toBeNull()
  })
})
