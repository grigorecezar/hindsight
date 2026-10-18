import { quantile } from './quantile'

export function median(values: readonly number[]): number | null {
  return quantile(values, 0.5)
}
