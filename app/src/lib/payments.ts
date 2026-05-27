export const FEE_RATE = 0.02

const MIN_CENTS: Record<string, number> = {
  gtq: 200,
  usd: 50,
  eur: 50,
}

export function computeFeeCents(offerPrice: number, currency: string): number {
  const min = MIN_CENTS[currency.toLowerCase()] ?? 200
  return Math.max(Math.round(offerPrice * FEE_RATE * 100), min)
}
