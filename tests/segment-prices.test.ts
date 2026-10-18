import { describe, expect, it } from 'vitest'
import {
  flatBand,
  segmentPrices,
} from '@/server/modules/analytics/utils/segmentPrices'

// Twenty flat days around 100, a five day jump to 130, twenty flat days.
const flatThenJump = [
  ...Array.from({ length: 20 }, (_, day) => 100 + (day % 3)),
  106,
  112,
  118,
  124,
  ...Array.from({ length: 20 }, (_, day) => 130 + (day % 3)),
]

describe('segmentPrices', () => {
  it('finds two flat stretches and the jump between them', () => {
    const segments = segmentPrices(flatThenJump, 0.06)
    expect(segments.map((segment) => segment.kind)).toEqual([
      'flat',
      'move',
      'flat',
    ])
    expect(segments[0]).toEqual({ kind: 'flat', startIndex: 0, endIndex: 19 })
    // The move shares its boundary days with the flats around it.
    expect(segments[1]).toEqual({ kind: 'move', startIndex: 19, endIndex: 24 })
    expect(segments[2].startIndex).toBe(24)
  })

  it('covers every day, even with no flat stretch at all', () => {
    const climbing = Array.from({ length: 30 }, (_, day) => 100 * 1.02 ** day)
    expect(segmentPrices(climbing, 0.06)).toEqual([
      { kind: 'move', startIndex: 0, endIndex: 29 },
    ])
  })

  it('treats a short pause inside a climb as part of the move', () => {
    const pause = [100, 104, 108, 110, 110, 110, 114, 118]
    expect(segmentPrices(pause, 0.06).map((segment) => segment.kind)).toEqual([
      'move',
    ])
  })
})

describe('segmentPrices steps', () => {
  it('puts a move between flat stretches that touch across a gap', () => {
    // Ten days around 100, then ten days around 90 starting the next day.
    const step = [
      ...Array.from({ length: 10 }, (_, day) => 100 + (day % 2)),
      ...Array.from({ length: 10 }, (_, day) => 90 + (day % 2)),
    ]
    expect(segmentPrices(step, 0.06)).toEqual([
      { kind: 'flat', startIndex: 0, endIndex: 9 },
      { kind: 'move', startIndex: 9, endIndex: 10 },
      { kind: 'flat', startIndex: 10, endIndex: 19 },
    ])
  })

  it('joins touching flat stretches when the step is small', () => {
    // A stretch filling its band, then one starting just above it the next
    // day: the band breaks, but the step between them is under 1%.
    const drift = [
      ...Array.from({ length: 10 }, (_, day) => (day % 2 ? 105.9 : 100)),
      ...Array.from({ length: 10 }, (_, day) => (day % 2 ? 110 : 106.5)),
    ]
    expect(segmentPrices(drift, 0.06)).toEqual([
      { kind: 'flat', startIndex: 0, endIndex: 19 },
    ])
  })
})

describe('flatBand', () => {
  it('scales with how much the stock moves in a day', () => {
    const calm = Array.from(
      { length: 50 },
      (_, day) => 100 * (day % 2 ? 1.005 : 1),
    )
    const jumpy = Array.from(
      { length: 50 },
      (_, day) => 100 * (day % 2 ? 1.04 : 1),
    )
    expect(flatBand(calm)).toBe(0.06)
    expect(flatBand(jumpy)).toBeCloseTo(0.19, 1)
  })
})
