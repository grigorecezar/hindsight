import { median } from '@/server/common/utils/median'
import type { PriceSegment } from '../types/PriceSegment'

// A flat stretch lasts at least this many trading days (two weeks).
const MIN_FLAT_DAYS = 10
// The band a flat stretch must stay inside, as a multiple of the stock's
// typical daily move, kept between these bounds.
const BAND_PER_DAILY_MOVE = 5
const MIN_BAND = 0.06
const MAX_BAND = 0.25

/**
 * How wide a flat stretch's band is for this stock: about five typical
 * daily moves. A calm stock gets a tight band, a jumpy one a wide band, so
 * ordinary noise never splits a stretch.
 */
export function flatBand(prices: readonly number[]): number {
  const dailyMoves = prices
    .slice(1)
    .map((price, index) => Math.abs(price / prices[index] - 1))
  const typical = median(dailyMoves) ?? 0.01
  return Math.min(MAX_BAND, Math.max(MIN_BAND, typical * BAND_PER_DAILY_MOVE))
}

/**
 * Splits prices into flat stretches and the moves between them, covering
 * every day. A flat stretch is the longest run from a day where the highest
 * price stays within `band` of the lowest, if it lasts MIN_FLAT_DAYS; the
 * days between flat stretches are moves.
 */
export function segmentPrices(
  prices: readonly number[],
  band: number = flatBand(prices),
): PriceSegment[] {
  const flats = joinFlats(findFlats(prices, band), prices, band)
  const segments: PriceSegment[] = []
  let previousEnd = -1

  for (const flat of flats) {
    // The move into this flat stretch, sharing its boundary days. Two flat
    // stretches side by side still get the step between them as a move.
    if (flat.startIndex > 0) {
      segments.push({
        kind: 'move',
        startIndex: Math.max(0, previousEnd),
        endIndex: flat.startIndex,
      })
    }
    segments.push(flat)
    previousEnd = flat.endIndex
  }

  // Whatever follows the last flat stretch is a move still going.
  const lastIndex = prices.length - 1
  if (previousEnd < lastIndex) {
    segments.push({
      kind: 'move',
      startIndex: Math.max(0, previousEnd),
      endIndex: lastIndex,
    })
  }
  return segments
}

/**
 * Flat stretches that touch, with less than half a band between their
 * edges, are one stretch drifting; joined so a small step is not a move.
 */
function joinFlats(
  flats: PriceSegment[],
  prices: readonly number[],
  band: number,
): PriceSegment[] {
  const joined: PriceSegment[] = []
  for (const flat of flats) {
    const previous = joined.at(-1)
    const isTouching = previous?.endIndex === flat.startIndex - 1
    const step = previous
      ? Math.abs(prices[flat.startIndex] / prices[previous.endIndex] - 1)
      : Infinity
    if (previous && isTouching && step < band / 2) {
      previous.endIndex = flat.endIndex
      continue
    }
    joined.push({ ...flat })
  }
  return joined
}

function findFlats(prices: readonly number[], band: number): PriceSegment[] {
  const flats: PriceSegment[] = []
  let start = 0

  while (start < prices.length) {
    const end = flatRunEnd(prices, start, band)
    if (end - start + 1 >= MIN_FLAT_DAYS) {
      flats.push({ kind: 'flat', startIndex: start, endIndex: end })
      start = end + 1
      continue
    }
    start += 1
  }
  return flats
}

/** The last index of the run from `start` that stays inside the band. */
function flatRunEnd(
  prices: readonly number[],
  start: number,
  band: number,
): number {
  let low = prices[start]
  let high = prices[start]
  let end = start
  while (end + 1 < prices.length) {
    const next = prices[end + 1]
    const nextLow = Math.min(low, next)
    const nextHigh = Math.max(high, next)
    if (nextHigh / nextLow - 1 > band) {
      break
    }
    low = nextLow
    high = nextHigh
    end += 1
  }
  return end
}
