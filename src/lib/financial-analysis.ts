import pb from '@/lib/pocketbase/client'

export const FIO_B_DEFAULT_RATE = 0.22
export const DEFAULT_TARIFF_RATE = 0.9

export const FIO_B_SCALING_FACTORS: Record<number, number> = {
  2026: 0.6,
  2027: 0.75,
  2028: 0.9,
}

export function getFioBScalingFactor(year?: number): number {
  const y = year || new Date().getFullYear()
  if (y <= 2026) return 0.6
  if (y === 2027) return 0.75
  if (y === 2028) return 0.9
  return 1.0
}

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
  fio_b_value: number
}

export interface FinancialProjection {
  currentMonthlyCost: number
  futureMonthlyBill: number
  monthlySavings: number
  roiMonths: number
  roiYears: number
  roiRemainingMonths: number
  instantConsumption: number
  compensatedConsumption: number
  energyFromGrid: number
  annualSavings: number
  effectiveRate: number
  baseRate: number
  icmsAmount: number
  fioBCost: number
  fioBScalingFactor: number
  fioBEffectiveRate: number
  publicLightingFee: number
  gridEnergyCost: number
  teComponent: number
  tusdComponent: number
  compensatedEnergyCost: number
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
}): FinancialProjection {
  const {
    avgConsumption,
    estMonthlyGen,
    simultaneityFactor,
    tariffDetails,
    systemPrice,
    publicLightingFee,
  } = params

  const { te, tusd, icms_rate, icms_exemption, fio_b_value } = tariffDetails
  const icmsFactor = icms_rate / 100
  const isTEExempt = icms_exemption === 'te' || icms_exemption === 'both'
  const isTUSDExempt = icms_exemption === 'tusd' || icms_exemption === 'both'

  const baseRate = te + tusd
  const effectiveRate = calculateEffectiveRate(te, tusd, icms_rate, icms_exemption)
  const currentMonthlyCost = avgConsumption * baseRate + publicLightingFee
  const icmsAmount = 0

  const instantConsumption = avgConsumption * (simultaneityFactor / 100)
  const remainingConsumption = avgConsumption - instantConsumption
  const compensatedConsumption = Math.min(remainingConsumption, estMonthlyGen)
  const energyFromGrid = Math.max(0, remainingConsumption - compensatedConsumption)

  const teComponent = isTEExempt ? te : te * (1 - icmsFactor)
  const tusdComponent = isTUSDExempt ? tusd : tusd * (1 - icmsFactor)
  const compensatedEnergyCost = compensatedConsumption * (teComponent + tusdComponent)

  const fioBScalingFactor = getFioBScalingFactor()
  const fioBBaseValue = fio_b_value || FIO_B_DEFAULT_RATE
  const fioBEffectiveRate = fioBBaseValue * fioBScalingFactor
  const fioBCost = compensatedConsumption * fioBEffectiveRate

  const gridEnergyCost = energyFromGrid * baseRate

  const futureMonthlyBill = compensatedEnergyCost + fioBCost + gridEnergyCost + publicLightingFee

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
    instantConsumption,
    compensatedConsumption,
    energyFromGrid,
    annualSavings,
    effectiveRate,
    baseRate,
    icmsAmount,
    fioBCost,
    fioBScalingFactor,
    fioBEffectiveRate,
    publicLightingFee,
    gridEnergyCost,
    teComponent,
    tusdComponent,
    compensatedEnergyCost,
  }
}

export async function fetchTariffDetails(
  utilityId: string,
  consumerCategory?: string,
): Promise<TariffDetails> {
  if (!utilityId) return { te: 0, tusd: 0, icms_rate: 0, icms_exemption: 'none', fio_b_value: 0 }
  try {
    const rules = await pb
      .collection('pv_tariff_rules')
      .getFullList({ filter: `utility_id='${utilityId}'` })
    if (rules.length === 0)
      return { te: 0, tusd: 0, icms_rate: 0, icms_exemption: 'none', fio_b_value: 0 }

    if (!consumerCategory) {
      return { te: 0, tusd: 0, icms_rate: 0, icms_exemption: 'none', fio_b_value: 0 }
    }

    const matched = rules.find((r) => r.class?.toLowerCase() === consumerCategory.toLowerCase())

    if (!matched) {
      return { te: 0, tusd: 0, icms_rate: 0, icms_exemption: 'none', fio_b_value: 0 }
    }

    return {
      te: Number(matched.te) || 0,
      tusd: Number(matched.tusd) || 0,
      icms_rate: Number(matched.icms_rate) || 0,
      icms_exemption: matched.icms_exemption || 'none',
      fio_b_value: Number(matched.fio_b_value) || 0,
    }
  } catch {
    return { te: 0, tusd: 0, icms_rate: 0, icms_exemption: 'none', fio_b_value: 0 }
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
