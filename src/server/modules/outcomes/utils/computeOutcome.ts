import { addMonths } from '@/server/common/utils/addMonths'
import { ratingDirection } from '../../calls/utils/ratingDirection'
import type { OutcomeInput } from '../types/OutcomeInput'
import type { OutcomeValues } from '../types/OutcomeValues'
import { isHit } from './isHit'

/**
 * What the stock did over one horizon after a call, or null while the
 * horizon has not fully passed. Returns use adjusted closes, so dividends
 * and splits do not count as moves.
 */
export function computeOutcome(input: OutcomeInput): OutcomeValues | null {
  const { series, benchmark, entryIndex } = input
  const entryDate = series.dateAt(entryIndex)
  const targetDate = addMonths(entryDate, input.months)

  // Matured only once both the stock and the benchmark have traded past it.
  const exitIndex = series.indexOnOrAfter(targetDate)
  const benchmarkEntryIndex = benchmark.indexOnOrAfter(entryDate)
  const benchmarkExitIndex = benchmark.indexOnOrAfter(targetDate)
  const isMatured =
    exitIndex !== -1 && benchmarkEntryIndex !== -1 && benchmarkExitIndex !== -1
  if (!isMatured) {
    return null
  }

  const stockReturn =
    series.adjustedAt(exitIndex) / series.adjustedAt(entryIndex) - 1
  const benchmarkReturn =
    benchmark.adjustedAt(benchmarkExitIndex) /
      benchmark.adjustedAt(benchmarkEntryIndex) -
    1
  const excessReturn = stockReturn - benchmarkReturn

  return {
    exitDate: series.dateAt(exitIndex),
    exitPrice: series.closeAt(exitIndex),
    stockReturn,
    benchmarkReturn,
    excessReturn,
    ...walkPath(input, exitIndex),
    isHit: isHit(input.rating, excessReturn, input.months),
  }
}

/** The swing between entry and exit, and when the target or stop was hit. */
function walkPath(
  input: OutcomeInput,
  exitIndex: number,
): Pick<
  OutcomeValues,
  'maxRunup' | 'maxDrawdown' | 'targetHitOn' | 'stopHitOn'
> {
  const { series, entryIndex, targetMove } = input
  const direction = ratingDirection(input.rating)
  const entryPrice = series.adjustedAt(entryIndex)

  let maxRunup = 0
  let maxDrawdown = 0
  let targetHitOn: string | null = null
  let stopHitOn: string | null = null

  for (let index = entryIndex + 1; index <= exitIndex; index++) {
    const move = series.adjustedAt(index) / entryPrice - 1
    const date = series.dateAt(index)
    maxRunup = Math.max(maxRunup, move)
    maxDrawdown = Math.min(maxDrawdown, move)

    // A hold has no direction, so it has no target or stop.
    const directedMove = direction * move
    targetHitOn ??= direction !== 0 && directedMove >= targetMove ? date : null
    stopHitOn ??= direction !== 0 && directedMove <= -targetMove ? date : null
  }

  return { maxRunup, maxDrawdown, targetHitOn, stopHitOn }
}
