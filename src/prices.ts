// Prices the tool descriptions quote. Mirrors the hosted server
// (import-dev workers/src/services/prices.ts); update both together.
export const PRICES = {
  captionTranscript: 0.003,
  houseTranscriptionPerMinute: 0.01
} as const

const atLeastACent = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 3
})

const belowACent = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumSignificantDigits: 3
})

// Balances hold 6 decimals; anything finer is float noise.
const roundToBalanceScale = (amount: number) => Math.round(amount * 1e6) / 1e6

/** "$3.00", "$2.997", "$0.003", "$0.0005". */
export const formatMoney = (amount: number): string => {
  const rounded = Number.isFinite(amount) ? roundToBalanceScale(amount) : 0
  if (rounded === 0) return atLeastACent.format(0)
  return Math.abs(rounded) < 0.01 ? belowACent.format(rounded) : atLeastACent.format(rounded)
}
