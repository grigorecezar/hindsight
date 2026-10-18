// A hold is right when the stock tracks the market within 5% over a month.
const BAND_AT_ONE_MONTH = 0.05

/**
 * How far from the benchmark a hold may drift and still count as right.
 * Widens with the square root of time, the way price noise does: about 7%
 * at 2 months, 8.7% at 3, 12% at 6 and 17% at 12.
 */
export function holdBand(months: number): number {
  return BAND_AT_ONE_MONTH * Math.sqrt(months)
}
