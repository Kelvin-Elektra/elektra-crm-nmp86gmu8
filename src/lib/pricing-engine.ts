export interface TaxEntry {
  rate: number
  weight: number
}

export interface PricingInput {
  kitCost: number
  fixedCosts: number
  taxes: TaxEntry[]
  marginRate: number
  billingModel: 'direct' | 'intermediated'
}

export function calculateEffectiveTaxRate(taxes: TaxEntry[]): number {
  return taxes.reduce((sum, t) => sum + (t.rate * t.weight) / 10000, 0)
}

export function calculateSalePrice(input: PricingInput): number {
  const { kitCost, fixedCosts, taxes, marginRate, billingModel } = input

  const effectiveTaxRate = calculateEffectiveTaxRate(taxes)
  const marginDecimal = marginRate / 100
  const denominator = 1 - effectiveTaxRate - marginDecimal

  if (denominator <= 0) return 0

  if (billingModel === 'intermediated') {
    const numerator = (1 - effectiveTaxRate) * kitCost + fixedCosts
    return numerator / denominator
  }

  const numerator = kitCost + fixedCosts
  return numerator / denominator
}

export function buildTaxEntries(
  taxCosts: Array<{ value: number }>,
  tax1Weight: number,
  tax2Weight: number,
): TaxEntry[] {
  const entries: TaxEntry[] = []
  if (taxCosts[0]) {
    entries.push({ rate: taxCosts[0].value || 0, weight: tax1Weight ?? 100 })
  }
  if (taxCosts[1]) {
    entries.push({ rate: taxCosts[1].value || 0, weight: tax2Weight ?? 0 })
  }
  return entries
}
