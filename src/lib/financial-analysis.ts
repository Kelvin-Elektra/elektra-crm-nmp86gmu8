import pb from '@/lib/pocketbase/client'

export const FIO_B_RATE = 0.08
export const DEFAULT_TARIFF_RATE = 0.9
export const COMPENSATION_RATE = 0.85

export const DEFAULT_SIMULTANEITY_FACTORS: Record<string, number> = {
  Residencial: 30,
  Comercial: 50,
  Industrial: 60,
  Rural: 40,
  Outros: 35,
}

export const CONSUMER_CATEGORIES = ['Residencial', 'Comercial', 'Industrial', 'Rural', 'Outros']

export interface TariffDetails {
  te: number
  tusd: number
  icms_rate: number
  icms_exemption: string
}

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
  effectiveRate: number
  baseRate: number
  icmsAmount: number
  fioBCost: number
  publicLightingFee: number
  gridEnergyCost: number
}

export function calculateEffectiveRate(
  te: number,
  tusd: number,
  icmsRate: number,
  icmsExemption: string,
): number {
  const icmsFactor = icmsRate / 100
  switch (icmsExemption) {
    case 'te':
      return te + tusd * (1 + icmsFactor)
    case 'tusd':
      return te * (1 + icmsFactor) + tusd
    case 'both':
      return te + tusd
    default:
      return (te + tusd) * (1 + icmsFactor)
  }
}

export function calculateFinancialProjection(params: {
  avgConsumption: number
  estMonthlyGen: number
  simultaneityFactor: number
  tariffDetails: TariffDetails
  systemPrice: number
  publicLightingFee: number
  fioBRate?: number
}): FinancialProjection {
  const {
    avgConsumption,
    estMonthlyGen,
    simultaneityFactor,
    tariffDetails,
    systemPrice,
    publicLightingFee,
    fioBRate = FIO_B_RATE,
  } = params

  const { te, tusd, icms_rate, icms_exemption } = tariffDetails
  const baseRate = te + tusd
  const effectiveRate = calculateEffectiveRate(te, tusd, icms_rate, icms_exemption)

  const currentMonthlyCost = avgConsumption * effectiveRate + publicLightingFee
  const icmsAmount = Math.max(0, avgConsumption * (effectiveRate - baseRate))

  const selfConsumed = estMonthlyGen * (simultaneityFactor / 100)
  const exportedToGrid = estMonthlyGen * (1 - simultaneityFactor / 100)
  const energyFromGrid = Math.max(0, avgConsumption - selfConsumed)

  const gridEnergyCost = energyFromGrid * effectiveRate
  const fioBCost = exportedToGrid * fioBRate
  const futureMonthlyBill = gridEnergyCost + fioBCost + publicLightingFee

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
    effectiveRate,
    baseRate,
    icmsAmount,
    fioBCost,
    publicLightingFee,
    gridEnergyCost,
  }
}

export async function fetchTariffDetails(
  utilityId: string,
  consumerCategory?: string,
): Promise<TariffDetails> {
  if (!utilityId) return { te: 0, tusd: 0, icms_rate: 0, icms_exemption: 'none' }
  try {
    const rules = await pb
      .collection('pv_tariff_rules')
      .getFullList({ filter: `utility_id='${utilityId}'` })
    if (rules.length === 0) return { te: 0, tusd: 0, icms_rate: 0, icms_exemption: 'none' }

    let rule = rules[0]
    if (consumerCategory) {
      const matched = rules.find(
        (r) =>
          r.class?.toLowerCase().includes(consumerCategory.toLowerCase()) ||
          consumerCategory.toLowerCase().includes(r.class?.toLowerCase() || ''),
      )
      if (matched) rule = matched
    }

    return {
      te: Number(rule.te) || 0,
      tusd: Number(rule.tusd) || 0,
      icms_rate: Number(rule.icms_rate) || 0,
      icms_exemption: rule.icms_exemption || 'none',
    }
  } catch {
    return { te: 0, tusd: 0, icms_rate: 0, icms_exemption: 'none' }
  }
}

export async function fetchTariffRate(
  utilityId: string,
  consumerCategory?: string,
): Promise<number> {
  const details = await fetchTariffDetails(utilityId, consumerCategory)
  const total = details.te + details.tusd
  return total > 0 ? total : DEFAULT_TARIFF_RATE
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
