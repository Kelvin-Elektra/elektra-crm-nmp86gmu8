/**
 * Recálculo REAL de custos e margem quando há desconto.
 *
 * Diagnóstico do usuário: ao aplicar desconto, os custos em percentual sobre a
 * venda (impostos, taxas, comissões, margem) continuavam sendo calculados sobre
 * o valor ANTES do desconto, e a margem exibida era a aproximação
 * "margem% − desconto%". Aqui fazemos o recálculo real:
 *
 *   venda_final = venda_base × (1 − desconto%)
 *   custos percentuais sobre a venda incidem sobre venda_final
 *   custos fixos e variáveis absolutos permanecem como estão
 *   margem_real = venda_final − (percentuais + kit_percent + fixos + variáveis)
 *
 * Nota de interpretação (leitura conservadora): a margem percentual da formação
 * de preço é re-derivada como RESTO da venda com desconto, e não como um
 * percentual travado aplicado por cima. Assim, o desconto sai da margem real,
 * mas os percentuais de impostos/comissões continuam incidindo sobre o valor
 * que o cliente efetivamente pagou.
 */

export interface AppliedCostLike {
  name?: string
  method: 'rate' | 'tax' | 'margin' | 'kit_percent' | 'commission' | 'fixed' | 'variable'
  value?: number
  amount?: number
  multiplier?: number
  calcBase?: string
  baseValue?: number
  taxWeight?: number
}

export interface PricingLike {
  autoKitPrice?: number
  kitPrice?: number
  fixedCosts?: number
  varCosts?: number
  rateSum?: number
  taxSum?: number
  marginSum?: number
  kitPercentSum?: number
  commissionSum?: number
  appliedCosts?: AppliedCostLike[]
  settings?: Record<string, any>
}

export interface DiscountRecalcInput {
  subtotal: number
  discountPercent: number
  pricing?: PricingLike
  billingModel?: string
}

export interface DiscountRecalcResult {
  baseTotal: number
  discountPercent: number
  discountValue: number
  finalTotal: number
  percentCostsTotal: number
  fixedCostsTotal: number
  costsTotal: number
  marginAmount: number
  marginPct: number
  detail: Array<{
    name: string
    label: string
    amount: number
    base: 'final_total' | 'kit' | 'fixed'
  }>
}

const safe = (v: any, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/** Rotula um custo em grupos do recálculo. */
function classifyCost(cost: AppliedCostLike): 'percent' | 'fixed' {
  return cost.method === 'fixed' || cost.method === 'variable' ? 'fixed' : 'percent'
}

/**
 * Recalcula custos e margem sobre o valor JÁ descontado.
 * Retorna null quando não há dados de custos para recalcular (comportamento
 * anterior preservado).
 */
export function recalcPricingWithDiscount(input: DiscountRecalcInput): DiscountRecalcResult | null {
  const { subtotal, discountPercent } = input
  const pricing = input.pricing

  if (!pricing) return null
  if (!Number.isFinite(subtotal) || subtotal <= 0) return null
  if (!Number.isFinite(discountPercent) || discountPercent <= 0) return null

  const billingModel = input.billingModel || pricing.settings?.billing_model || 'direct'

  const baseTotal = subtotal
  const finalTotal = baseTotal * (1 - safe(discountPercent) / 100)
  const discountValue = baseTotal - finalTotal

  // Kit: manual (pricing.kitPrice) tem precedência sobre o automático.
  const kitPrice = safe(pricing.kitPrice, NaN) || safe(pricing.autoKitPrice, 0) || 0

  // Custos absolutos (fixos + variáveis) não mudam com o desconto.
  const fixedCostsTotal = safe(pricing.fixedCosts) + safe(pricing.varCosts)

  const detail: DiscountRecalcResult['detail'] = []

  // 1) Percentuais sobre a venda recalculados sobre finalTotal
  let percentCostsTotal = 0
  const costs = Array.isArray(pricing.appliedCosts) ? pricing.appliedCosts : []
  if (costs.length > 0) {
    for (const cost of costs) {
      if (classifyCost(cost) !== 'percent') continue
      let amount = 0
      let base: 'final_total' | 'kit' | 'fixed' = 'final_total'
      if (cost.method === 'tax') {
        const weight = safe(cost.taxWeight, 100) / 100
        amount = finalTotal * (safe(cost.value) / 100) * weight
        // Em modelo intermediado, imposto incide sobre (venda − kit)
        if (billingModel === 'intermediated') {
          const taxable = Math.max(0, finalTotal - kitPrice)
          amount = taxable * (safe(cost.value) / 100) * weight
        }
        base = 'final_total'
      } else if (cost.method === 'kit_percent') {
        amount = kitPrice * (safe(cost.value) / 100)
        base = 'kit'
      } else {
        // rate, margin, commission
        amount = finalTotal * (safe(cost.value) / 100)
        base = 'final_total'
      }
      percentCostsTotal += amount
      detail.push({
        name: cost.name || cost.method,
        label:
          cost.method === 'tax'
            ? `${safe(cost.value)}%${safe(cost.taxWeight, 100) !== 100 ? ` (peso ${safe(cost.taxWeight)}%)` : ''} s/ venda c/ desconto`
            : `${safe(cost.value)}% s/ venda c/ desconto`,
        amount,
        base,
      })
      // custo "margin" também re-derivado como % da venda descontada
    }
  } else {
    // Sem appliedCosts detalhado, usa somas agregadas
    const aggPercent = safe(pricing.rateSum) + safe(pricing.taxSum) + safe(pricing.commissionSum)
    if (aggPercent > 0) {
      percentCostsTotal = finalTotal * aggPercent
      detail.push({
        name: 'percentuais_agregados',
        label: 'Taxas + impostos + comissões (soma agregada)',
        amount: percentCostsTotal,
        base: 'final_total',
      })
    }
  }

  const costsTotal = percentCostsTotal + fixedCostsTotal
  const marginAmount = Math.max(0, finalTotal - costsTotal)
  const marginPct = finalTotal > 0 ? marginAmount / finalTotal : 0

  return {
    baseTotal,
    discountPercent: safe(discountPercent),
    discountValue,
    finalTotal,
    percentCostsTotal,
    fixedCostsTotal,
    costsTotal,
    marginAmount,
    marginPct,
    detail,
  }
}
