import pb from '@/lib/pocketbase/client'

export interface FinancialProjection {
  currentMonthlyCost: number
  futureMonthlyBill: number
  monthlySavings: number
  roiMonths: number
  roiYears: number
  roiRemainingMonths: number
  selfConsumed: number
  exportedToGrid: number
  energyFromGrid: number
  annualSavings: number
}

export const DEFAULT_SIMULTANEITY_FACTORS: Record<string, number> = {
  Residencial: 30,
  Comercial: 50,
  Industrial: 60,
  Rural: 40,
  Outros: 35,
}

export const CONSUMER_CATEGORIES = ['Residencial', 'Comercial', 'Industrial', 'Rural', 'Outros']

export const DEFAULT_TARIFF_RATE = 0.9
export const COMPENSATION_RATE = 0.85

export function calculateFinancialProjection(params: {
  avgConsumption: number
  estMonthlyGen: number
  simultaneityFactor: number
  tariffRate: number
  systemPrice: number
  compensationRate?: number
}): FinancialProjection {
  const {
    avgConsumption,
    estMonthlyGen,
    simultaneityFactor,
    tariffRate,
    systemPrice,
    compensationRate = COMPENSATION_RATE,
  } = params

  const selfConsumed = estMonthlyGen * (simultaneityFactor / 100)
  const exportedToGrid = estMonthlyGen * (1 - simultaneityFactor / 100)
  const energyFromGrid = Math.max(0, avgConsumption - selfConsumed)
  const currentMonthlyCost = avgConsumption * tariffRate
  const gridCost = energyFromGrid * tariffRate
  const creditValue = exportedToGrid * tariffRate * compensationRate
  const futureMonthlyBill = Math.max(0, gridCost - creditValue)
  const monthlySavings = Math.max(0, currentMonthlyCost - futureMonthlyBill)
  const roiMonths = monthlySavings > 0 ? systemPrice / monthlySavings : 0
  const roiYears = Math.floor(roiMonths / 12)
  const roiRemainingMonths = Math.ceil(roiMonths % 12)
  const annualSavings = monthlySavings * 12

  return {
    currentMonthlyCost,
    futureMonthlyBill,
    monthlySavings,
    roiMonths,
    roiYears,
    roiRemainingMonths,
    selfConsumed,
    exportedToGrid,
    energyFromGrid,
    annualSavings,
  }
}

export async function fetchTariffRate(
  utilityId: string,
  consumerCategory?: string,
): Promise<number> {
  if (!utilityId) return DEFAULT_TARIFF_RATE
  try {
    const rules = await pb
      .collection('pv_tariff_rules')
      .getFullList({ filter: `utility_id='${utilityId}'` })
    if (rules.length === 0) return DEFAULT_TARIFF_RATE

    let rule = rules[0]
    if (consumerCategory) {
      const matched = rules.find(
        (r) =>
          r.class?.toLowerCase().includes(consumerCategory.toLowerCase()) ||
          consumerCategory.toLowerCase().includes(r.class?.toLowerCase() || ''),
      )
      if (matched) rule = matched
    }

    const tusd = Number(rule.tusd) || 0
    const te = Number(rule.te) || 0
    const total = tusd + te
    return total > 0 ? total : DEFAULT_TARIFF_RATE
  } catch {
    return DEFAULT_TARIFF_RATE
  }
}

export async function fetchLatestProposalPrice(negotiationId: string): Promise<number> {
  try {
    const proposals = await pb.collection('proposals').getFullList({
      filter: `negotiation_id='${negotiationId}'`,
      sort: '-created',
    })
    if (proposals.length === 0) return 0
    const latest = proposals[0]
    return Number(latest.total_value || latest.price || 0)
  } catch {
    return 0
  }
}
