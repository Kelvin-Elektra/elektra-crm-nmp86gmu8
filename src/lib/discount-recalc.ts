/**
 * Recálculo REAL de custos e margem quando há desconto.
 *
 * Regra confirmada pelo usuário: NÃO alterar o motor de formação de preço do
 * orçamento — este módulo só re-deriva os valores QUANDO HÁ desconto:
 *
 *   venda_final = venda_base × (1 − desconto%)
 *   impostos, taxas e comissões (percentuais sobre a venda) incidem sobre
 *   venda_final — eles NÃO absorvem o desconto
 *   kit, custos fixos, variáveis e kit_percent permanecem como estão
 *   margem_real = venda_final − (TODOS os custos, kit incluído)  ← resto,
 *                 PODE SER NEGATIVA (em R$ e em %)
 *
 * Exemplo do usuário (margem 20%, comissão 4%, imposto 15%, custos que não
 * dependem da venda = 20.000 → antes do desconto sobram 39% para distribuir;
 * venda_base = 20.000 / 0,61 ≈ 32.786,89). Com desconto de 5%:
 *   venda_final = 31.147,54; imposto 15% = 4.672,13; comissão 4% = 1.245,90;
 *   margem = 31.147,54 − 20.000 − 4.672,13 − 1.245,90 = 5.229,51 = 16,79%
 *   da venda com desconto (a margem percentual é sempre sobre a venda_final).
 *
 * O motor de formação de preço do Kit PV não é alterado: os custos-base
 * originais são preservados em appliedCosts[].value e os recalculados vão em
 * calculatedAmount.
 */

export interface AppliedCostLike {
  name?: string
  method: 'rate' | 'tax' | 'margin' | 'kit_percent' | 'commission' | 'fixed' | 'variable' | 'kit'
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
  /** TODOS os custos que não mudam com o desconto: kit + fixos + variáveis + kit_percent. */
  fixedCostsTotal: number
  costsTotal: number
  /** Pode ser NEGATIVA quando o desconto engole a margem. */
  marginAmount: number
  /** Percentual sobre a venda_final — também pode ser negativo. */
  marginPct: number
  /** Margem SEM desconto (mesma engenharia) — para exibir "Margem Original". */
  baseMarginAmount: number
  baseMarginPct: number
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

/**
 * Valor absoluto de um custo "fixo-like" (fixo/variável/kit_percent).
 * Prioridade: amount > calculatedAmount > derivado (kit_percent × kit) > value.
 */
function fixedAmountOf(cost: AppliedCostLike, kitPrice: number): number {
  const amt = safe(cost.amount, NaN)
  if (Number.isFinite(amt) && amt !== 0) return amt
  const calc = safe(cost.calculatedAmount, NaN)
  if (Number.isFinite(calc) && calc !== 0) return calc
  if (cost.method === 'kit_percent') {
    const pct = safe(cost.value)
    if (pct > 0) return (kitPrice * pct) / 100
    return 0
  }
  return safe(cost.value)
}

/**
 * Valor percentual de um custo sobre a venda. Prioridade: value (percentual
 * configurado) > calculatedAmount preservado (proporcional à nova venda).
 */
function percentValueOf(cost: AppliedCostLike, baseTotal: number): number {
  const v = safe(cost.value, NaN)
  if (Number.isFinite(v) && v > 0) return v
  // Sem percentual declarado, deriva o percentual do valor já calculado
  // sobre a venda base (preserva a proporção original, não zera o custo).
  const calc = safe(cost.calculatedAmount)
  if (calc > 0 && baseTotal > 0) return (calc / baseTotal) * 100
  return 0
}

/**
 * Recalcula custos e margem sobre o valor JÁ descontado.
 * Aceita desconto 0 (devolve a decomposição real da proposta sem desconto).
 * Retorna null quando não há base de custos para recalcular (sem appliedCosts
 * e sem somas agregadas) — não inventa cálculo.
 */
export function recalcPricingWithDiscount(input: DiscountRecalcInput): DiscountRecalcResult | null {
  const { subtotal, discountPercent } = input
  const pricing = input.pricing

  if (!pricing) return null
  if (!Number.isFinite(subtotal) || subtotal <= 0) return null
  if (!Number.isFinite(discountPercent) || discountPercent < 0) return null

  const billingModel = input.billingModel || pricing.settings?.billing_model || 'direct'
  const intermediated = billingModel === 'intermediated'

  const baseTotal = subtotal
  const scale = 1 - safe(discountPercent) / 100
  const finalTotal = baseTotal * scale
  const discountValue = baseTotal - finalTotal

  // Kit: manual (pricing.kitPrice) tem precedência sobre o automático.
  let kitPrice = safe(pricing.kitPrice, NaN) || safe(pricing.autoKitPrice, 0) || 0

  // Base de imposto: em modelo intermediado o imposto não incide sobre o kit.
  const taxBaseOf = (sale: number) => (intermediated ? Math.max(0, sale - kitPrice) : sale)

  const costs = Array.isArray(pricing.appliedCosts) ? pricing.appliedCosts : []
  const aggPercent = safe(pricing.rateSum) + safe(pricing.taxSum) + safe(pricing.commissionSum)
  const marginSumVal = safe(pricing.marginSum)
  if (costs.length === 0 && aggPercent <= 0 && marginSumVal <= 0) return null

  // Snapshot sem kitPrice: recupera o valor do kit pelo item 'kit' dos custos.
  if (kitPrice <= 0) {
    const kitCost = costs.find((c) => c.method === 'kit')
    if (kitCost) kitPrice = fixedAmountOf(kitCost, 0)
  }

  const detail: DiscountRecalcResult['detail'] = []
  const outCosts: AppliedCostLike[] = costs.map((c) => ({ ...c }))

  /**
   * Decomposição para uma dada venda (finalTotal ou baseTotal).
   * percentCosts: taxas/impostos/comissões incidem sobre a venda corrente.
   * fixedCostsTotal: TODOS os custos que não dependem da venda (kit incluído,
   * contado UMA única vez — itens method 'kit' em appliedCosts são ignorados
   * para não duplicar com pricing.kitPrice).
   * margin: RESTO da venda — pode ser negativa.
   */
  const decompose = (sale: number) => {
    let percentCosts = 0
    let fixedCosts = 0

    if (costs.length > 0) {
      for (let i = 0; i < costs.length; i++) {
        const cost = costs[i]
        if (isPercentOfSaleMethod(cost.method)) {
          const pctValue = percentValueOf(cost, baseTotal)
          let amount: number
          if (cost.method === 'tax') {
            const weight = safe(cost.taxWeight, 100) / 100
            amount = taxBaseOf(sale) * (pctValue / 100) * weight
          } else {
            // rate, commission
            amount = sale * (pctValue / 100)
          }
          percentCosts += amount
          if (sale === finalTotal) {
            outCosts[i].calculatedAmount = amount
            detail.push({
              name: cost.name || cost.method,
              label:
                cost.method === 'tax'
                  ? `${pctValue}%${safe(cost.taxWeight, 100) !== 100 ? ` (peso ${safe(cost.taxWeight)}%)` : ''} s/ venda c/ desconto`
                  : `${pctValue}% s/ venda c/ desconto`,
              amount,
              base: 'final_total',
            })
          }
          continue
        }
        // "margin" não é custo: a margem real é re-derivada como resto abaixo.
        // "kit" também não: o kit entra uma única vez via pricing.kitPrice.
        if (cost.method === 'margin' || cost.method === 'kit') continue
        if (isFixedLikeMethod(cost.method)) {
          const amount = fixedAmountOf(cost, kitPrice)
          fixedCosts += amount
          if (sale === finalTotal) {
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
        }
      }
      // O kit em si é custo fixo: entra uma única vez aqui.
      fixedCosts += kitPrice
    } else {
      // Fallback sem appliedCosts: reconstrói pela engenharia de preço do motor
      // (venda_base = custos_base / (1 − rate − tax − commission − margin)).
      const denominator = 1 - aggPercent - marginSumVal
      percentCosts =
        sale * (safe(pricing.rateSum) + safe(pricing.commissionSum)) +
        taxBaseOf(sale) * safe(pricing.taxSum)
      // Custos fixos = parte da venda_base que não é percentual nem margem;
      // no intermediado o imposto "poupa" o kit, então T×kit volta como custo.
      fixedCosts = baseTotal * denominator + (intermediated ? safe(pricing.taxSum) * kitPrice : 0)
      if (sale === finalTotal) {
        detail.push({
          name: 'percentuais_agregados',
          label: 'Taxas + impostos + comissões (soma agregada, s/ venda c/ desconto)',
          amount: percentCosts,
          base: 'final_total',
        })
      }
    }

    const costsTotal = percentCosts + fixedCosts
    // Margem real = RESTO. Sem travamento em zero: pode (e deve) ser negativa
    // quando o desconto é grande — em R$ e em %.
    const marginAmount = sale - costsTotal
    const marginPct = sale > 0 ? marginAmount / sale : 0
    return { percentCosts, fixedCosts, costsTotal, marginAmount, marginPct }
  }

  const discounted = decompose(finalTotal)
  const base = decompose(baseTotal)

  return {
    baseTotal,
    discountPercent: safe(discountPercent),
    discountValue,
    finalTotal,
    percentCostsTotal: discounted.percentCosts,
    fixedCostsTotal: discounted.fixedCosts,
    costsTotal: discounted.costsTotal,
    marginAmount: discounted.marginAmount,
    marginPct: discounted.marginPct,
    baseMarginAmount: base.marginAmount,
    baseMarginPct: base.marginPct,
    appliedCosts: outCosts,
    detail,
  }
}
