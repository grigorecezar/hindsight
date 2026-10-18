import { describe, expect, it } from 'vitest'
import { addMonths } from '@/server/common/utils/addMonths'
import { Rating } from '@/server/modules/calls/enums/Rating'
import { computeOutcome } from '@/server/modules/outcomes/utils/computeOutcome'
import { entryDateFor } from '@/server/modules/outcomes/utils/entryDateFor'
import { holdBand } from '@/server/modules/outcomes/utils/holdBand'
import { weekdaySeries } from './helpers'

describe('addMonths', () => {
  it('clamps to the end of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
    expect(addMonths('2026-11-15', 2)).toBe('2027-01-15')
    expect(addMonths('2026-03-31', 12)).toBe('2027-03-31')
  })
})

describe('entryDateFor', () => {
  it('enters the same day when published before the close', () => {
    expect(entryDateFor(new Date('2026-09-15T08:30:00-04:00'))).toBe(
      '2026-09-15',
    )
    expect(entryDateFor(new Date('2026-09-15T15:59:00-04:00'))).toBe(
      '2026-09-15',
    )
  })

  it('enters the next day when published after the close', () => {
    expect(entryDateFor(new Date('2026-09-15T16:00:00-04:00'))).toBe(
      '2026-09-16',
    )
    // 1am UTC on the 16th is still the evening of the 15th in New York.
    expect(entryDateFor(new Date('2026-09-16T01:00:00Z'))).toBe('2026-09-16')
  })
})

describe('computeOutcome', () => {
  // The stock climbs 1% a trading day; the benchmark is flat.
  const stock = weekdaySeries(
    'ACME',
    '2026-01-05',
    (day) => 100 * 1.01 ** day,
    300,
  )
  const flat = weekdaySeries('SPY', '2026-01-05', () => 400, 300)

  it('measures return, excess, swing and the target date', () => {
    const outcome = computeOutcome({
      rating: Rating.BUY,
      series: stock,
      benchmark: flat,
      entryIndex: 0,
      months: 1,
      targetMove: 0.1,
    })
    // February 5, 2026 is 23 trading days after January 5.
    expect(outcome?.exitDate).toBe('2026-02-05')
    expect(outcome?.stockReturn).toBeCloseTo(1.01 ** 23 - 1, 10)
    expect(outcome?.benchmarkReturn).toBe(0)
    expect(outcome?.excessReturn).toBeCloseTo(1.01 ** 23 - 1, 10)
    expect(outcome?.maxDrawdown).toBe(0)
    // 1.01^10 is the first close 10% above the entry.
    expect(outcome?.targetHitOn).toBe(stock.dateAt(10))
    expect(outcome?.stopHitOn).toBeNull()
    expect(outcome?.isHit).toBe(true)
  })

  it('scores a sell on the same move as a miss that hit its stop', () => {
    const outcome = computeOutcome({
      rating: Rating.STRONG_SELL,
      series: stock,
      benchmark: flat,
      entryIndex: 0,
      months: 1,
      targetMove: 0.1,
    })
    expect(outcome?.isHit).toBe(false)
    expect(outcome?.targetHitOn).toBeNull()
    expect(outcome?.stopHitOn).toBe(stock.dateAt(10))
  })

  it('judges a hold against the hold band', () => {
    const steady = weekdaySeries(
      'STDY',
      '2026-01-05',
      (day) => 100 + day * 0.01,
      300,
    )
    const outcome = computeOutcome({
      rating: Rating.HOLD,
      series: steady,
      benchmark: flat,
      entryIndex: 0,
      months: 3,
      targetMove: 0.1,
    })
    expect(Math.abs(outcome!.excessReturn)).toBeLessThan(holdBand(3))
    expect(outcome?.isHit).toBe(true)
    expect(outcome?.targetHitOn).toBeNull()
  })

  it('returns null until the horizon has passed', () => {
    const outcome = computeOutcome({
      rating: Rating.BUY,
      series: stock,
      benchmark: flat,
      entryIndex: 250,
      months: 12,
      targetMove: 0.1,
    })
    expect(outcome).toBeNull()
  })
})
