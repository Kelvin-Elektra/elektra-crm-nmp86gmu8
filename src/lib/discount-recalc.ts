/**
 * Recálculo REAL de custos e margem quando há desconto.
 *
 * Diagnóstico do usuário: ao aplicar desconto, os custos em percentual sobre a
 * venda (impostos, taxas, comissões) continuavam sendo calculados sobre o valor
 * ANTES do desconto, e a margem exibida era a aproximação
 * "margem% − desconto%". Aqui fazemos o recálculo real:
 *
 *   venda_final = venda_base × (1 − desconto%)
 *   custos percentuais sobre a venda (tax/rate/commission) incidem sobre venda_final
 *   kit, custos fixos, variáveis e kit_percent permanecem como estão
 *   margem_real = venda_final − (todos os custos)   ← resto, não % travado
 *
 * O motor de formação de preço do Kit PV não é alterado: este módulo só rederi-
 * va os valores quando há desconto, preservando os custos-base originais em
 * appliedCosts[].value e devolvendo os valores recalculados em calculatedAmount.
 */

export interface AppliedCostLike {
  name?: string
  method: 'rate' | 'tax' | 'margin' | 'kit_percent' | 'commission' | 'fixed' | 'variable'
  value?: number
  amount?: number
  calculatedAmount?: number
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
  /** Custos originais com calculatedAmount recalculado; value original intacto. */
  appliedCosts: AppliedCostLike[]
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

/**
 * Métodos que incidem como percentual sobre o valor da venda (e por isso
 * precisam ser recalculados sobre a venda JÁ descontada). "margin" NÃO é
 * custo percentual: a margem é re-derivada como resto da venda.
 */
export function isPercentOfSaleMethod(method: AppliedCostLike['method'] | string): boolean {
  return method === 'tax' || method === 'rate' || method === 'commission'
}

/** Custos que não mudam com o desconto: fixos, variáveis e kit_percent. */
function isFixedLikeMethod(method: AppliedCostLike['method'] | string): boolean {
  return method === 'fixed' || method === 'variable' || method === 'kit_percent'
}

/** Valor absoluto de um custo "fixo-like" (prioridade: amount > calculatedAmount > derivado). */
function fixedAmountOf(cost: AppliedCostLike, kitPrice: number): number {
  const amt = safe(cost.amount, NaN)
  if (Number.isFinite(amt)) return amt
  const calc = safe(cost.calculatedAmount, NaN)
  if (Number.isFinite(calc)) return calc
  if (cost.method === 'kit_percent') return (kitPrice * safe(cost.value)) / 100
  return safe(cost.value)
}

/**
 * Recalcula custos e margem sobre o valor JÁ descontado.
 * Retorna null quando não há base de custos para recalcular (sem appliedCosts
 * e sem somas agregadas) — comportamento anterior preservado.
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

  const costs = Array.isArray(pricing.appliedCosts) ? pricing.appliedCosts : []
  const aggPercent = safe(pricing.rateSum) + safe(pricing.taxSum) + safe(pricing.commissionSum)
  if (costs.length === 0 && aggPercent <= 0) return null

  const detail: DiscountRecalcResult['detail'] = []
  const outCosts: AppliedCostLike[] = costs.map((c) => ({ ...c }))

  // 1) Percentuais sobre a venda recalculados sobre finalTotal
  let percentCostsTotal = 0
  for (let i = 0; i < costs.length; i++) {
    const cost = costs[i]
    if (!isPercentOfSaleMethod(cost.method)) continue
    let amount: number
    let base: 'final_total' | 'kit' = 'final_total'
    if (cost.method === 'tax') {
      const weight = safe(cost.taxWeight, 100) / 100
      // Em modelo intermediado, imposto incide sobre (venda − kit)
      const taxBase =
        billingModel === 'intermediated' ? Math.max(0, finalTotal - kitPrice) : finalTotal
      amount = taxBase * (safe(cost.value) / 100) * weight
      base = 'final_total'
    } else {
      // rate, commission
      amount = finalTotal * (safe(cost.value) / 100)
      base = 'final_total'
    }
    // Sem percentual declarado, preserva o valor já calculado (não zera o custo)
    if (!Number.isFinite(Number(cost.value))) {
      amount = safe(cost.calculatedAmount)
    }
    percentCostsTotal += amount
    outCosts[i].calculatedAmount = amount
    detail.push({
      name: cost.name || cost.method,
      label:
        cost.method === 'tax'
          ? `${safe(cost.value)}%${safe(cost.taxWeight, 100) !== 100 ? ` (peso ${safe(cost.taxWeight)}%)` : ''} s/ venda c/ desconto`
          : `${safe(cost.value)}% s/ venda c/ desconto`,
      amount,
      base,
    })
  }

  // Fallback: sem appliedCosts detalhado, usa somas agregadas
  if (costs.length === 0 && aggPercent > 0) {
    percentCostsTotal = finalTotal * aggPercent
    detail.push({
      name: 'percentuais_agregados',
      label: 'Taxas + impostos + comissões (soma agregada)',
      amount: percentCostsTotal,
      base: 'final_total',
    })
  }

  // 2) Custos que não mudam com o desconto: kit + fixos + variáveis + kit_percent
  let fixedCostsTotal = kitPrice + safe(pricing.fixedCosts) + safe(pricing.varCosts)
  for (let i = 0; i < costs.length; i++) {
    const cost = costs[i]
    // "margin" não é custo: a margem real é re-derivada como resto abaixo
    if (cost.method === 'margin' || isPercentOfSaleMethod(cost.method)) continue
    const amount = fixedAmountOf(cost, kitPrice)
    fixedCostsTotal += amount
    outCosts[i].calculatedAmount = amount
    detail.push({
      name: cost.name || cost.method,
      label:
        cost.method === 'kit_percent'
          ? `${safe(cost.value)}% s/ kit (inalterado)`
          : 'Valor fixo (inalterado)',
      amount,
      base: cost.method === 'kit_percent' ? 'kit' : 'fixed',
    })
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
    appliedCosts: outCosts,
    detail,
  }
}
