import { mean } from '@/server/common/utils/mean'

/**
 * Spearman rank correlation, with tied values sharing their average rank
 * (ratings have only five values, so ties are the norm). Null below three
 * pairs or when either side never varies.
 */
export function spearman(
  xs: readonly number[],
  ys: readonly number[],
): number | null {
  if (xs.length < 3 || xs.length !== ys.length) {
    return null
  }
  return pearson(ranks(xs), ranks(ys))
}

function ranks(values: readonly number[]): number[] {
  const order = values
    .map((value, index) => ({ value, index }))
    .sort((a, b) => a.value - b.value)
  const result = new Array<number>(values.length)

  let start = 0
  while (start < order.length) {
    let end = start
    while (
      end + 1 < order.length &&
      order[end + 1].value === order[start].value
    ) {
      end++
    }
    const averageRank = (start + end) / 2 + 1
    for (let position = start; position <= end; position++) {
      result[order[position].index] = averageRank
    }
    start = end + 1
  }
  return result
}

function pearson(xs: number[], ys: number[]): number | null {
  const meanX = mean(xs) ?? 0
  const meanY = mean(ys) ?? 0

  let covariance = 0
  let varianceX = 0
  let varianceY = 0
  for (let index = 0; index < xs.length; index++) {
    const dx = xs[index] - meanX
    const dy = ys[index] - meanY
    covariance += dx * dy
    varianceX += dx * dx
    varianceY += dy * dy
  }

  if (varianceX === 0 || varianceY === 0) {
    return null
  }
  return covariance / Math.sqrt(varianceX * varianceY)
}
