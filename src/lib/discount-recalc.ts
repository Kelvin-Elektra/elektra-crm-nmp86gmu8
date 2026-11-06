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
  /** Se o custo foi editado manualmente em R$ (transformado em constante) */
  manualFixedAmount?: number | null
  /** Alíquota implícita gravada para auditoria quando item percentual foi editado em R$ */
  implicitRate?: number | null
  isOverridden?: boolean
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

/** Sobrescrita manual por item de custo */
export interface CostManualOverride {
  /** Identificador do item (nome ou índice) */
  costName: string
  /** Novo valor total fixado em R$ */
  manualAmount: number
}

export interface DiscountRecalcInput {
  subtotal: number
  discountPercent?: number
  targetSalePrice?: number
  pricing?: PricingLike | null
  billingModel?: string | null
  /** Sobrescritas manuais de custos individuais em R$ */
  costOverrides?: Record<string, number> | CostManualOverride[]
  /** Força o recálculo/resolução da equação da venda mesmo sem nenhum override manual */
  recomputeBaseSale?: boolean
  /** Callback opcional quando o denominador for <= 0.001 (soma das alíquotas >= 1) */
  onDenominatorWarning?: (warning: string) => void
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
    implicitRate?: number
    isManual?: boolean
  }>
  /** Informações sobre o recálculo com itens desembaraçados */
  unresolvedSum?: number
  denominatorWarning?: string | null
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
/** Normaliza o mapa de sobrescritas manuais (por nome ou objeto) */
function normalizeOverrides(
  overrides?: Record<string, number> | CostManualOverride[],
): Map<string, number> {
  const map = new Map<string, number>()
  if (!overrides) return map
  if (Array.isArray(overrides)) {
    for (const item of overrides) {
      if (item && item.costName) {
        map.set(item.costName, safe(item.manualAmount))
      }
    }
  } else if (typeof overrides === 'object') {
    for (const [key, val] of Object.entries(overrides)) {
      if (val !== null && val !== undefined) {
        map.set(key, safe(val))
      }
    }
  }
  return map
}

/**
 * Recalcula custos e margem sobre o valor JÁ descontado ou com itens editados
 * manualmente em R$ (transformados em constantes no numerador).
 *
 * Aceita:
 * 1) costOverrides: mapa de { nome_do_custo: valor_em_reais }
 *    - Itens fixos: viram o novo valor no numerador
 *    - Itens variáveis (R$ x kWp/mods): derivam valor total fixo no numerador
 *    - Itens percentuais (% sobre venda): SAEM do denominador e ENTRAM no numerador como R$
 *    - Denominador = 1 - soma(alíquotas restantes). GUARD: se soma >= 1 (ou denom <= 0.001) bloqueia.
 * 2) Desconto via discountPercent ou targetSalePrice (sobre a venda base resultante)
 */
export function recalcPricingWithDiscount(input: DiscountRecalcInput): DiscountRecalcResult | null {
  const { subtotal } = input
  const pricing = input.pricing

  if (!pricing) return null
  if (!Number.isFinite(subtotal) || subtotal <= 0) return null

  const billingModel = input.billingModel || pricing.settings?.billing_model || 'direct'
  const intermediated = billingModel === 'intermediated'

  // Kit: manual (pricing.kitPrice) tem precedência sobre o automático.
  let kitPrice = safe(pricing.kitPrice, NaN) || safe(pricing.autoKitPrice, 0) || 0

  const costs = Array.isArray(pricing.appliedCosts) ? pricing.appliedCosts : []
  const aggPercent = safe(pricing.rateSum) + safe(pricing.taxSum) + safe(pricing.commissionSum)
  const marginSumVal = safe(pricing.marginSum)
  if (costs.length === 0 && aggPercent <= 0 && marginSumVal <= 0) return null

  // Snapshot sem kitPrice: recupera o valor do kit pelo item 'kit' dos custos.
  if (kitPrice <= 0) {
    const kitCost = costs.find((c) => c.method === 'kit')
    if (kitCost) kitPrice = fixedAmountOf(kitCost, 0)
  }

  const overrideMap = normalizeOverrides(input.costOverrides)
  const hasManualOverrides = overrideMap.size > 0
  const shouldRecomputeBase = hasManualOverrides || input.recomputeBaseSale === true

  // Se há itens manuais ou foi solicitado recomputeBaseSale, recalculamos a VENDA BASE via fórmula exata:
  // Numerador C_num = Kit + kitPercentAmount + fixos + variáveis + itens_percentuais_desembaraçados(R$)
  // Denominador = 1 - sum(alíquotas_restantes_sobre_venda) - marginSum
  // Em modelo intermediado: impostos não incidem sobre o kit; se imposto NÃO foi desembaraçado,
  // termo (1 - T_restante)*Kit entra no numerador.
  let calculatedBaseSale = subtotal
  let denominatorWarning: string | null = null

  if (shouldRecomputeBase) {
    let fixedNumerator = kitPrice
    let remainingRateSum = 0
    let remainingTaxSum = 0
    let remainingMarginSum = marginSumVal

    // Checa se o kit em si foi sobrescrito
    if (overrideMap.has('kit') || overrideMap.has('Kit Fotovoltaico (Equipamentos e Insumos)')) {
      const kitOv =
        overrideMap.get('kit') ?? overrideMap.get('Kit Fotovoltaico (Equipamentos e Insumos)')!
      kitPrice = kitOv
      fixedNumerator = kitOv
    }

    for (let i = 0; i < costs.length; i++) {
      const cost = costs[i]
      if (cost.method === 'kit') continue

      const isOverridden = cost.name ? overrideMap.has(cost.name) : false
      const overrideVal = isOverridden ? overrideMap.get(cost.name!)! : 0

      if (cost.method === 'margin') {
        if (isOverridden) {
          // Se a margem foi fixada em R$, sai do denominador e entra no numerador
          fixedNumerator += overrideVal
          remainingMarginSum = 0
        }
        continue
      }

      if (isPercentOfSaleMethod(cost.method)) {
        if (isOverridden) {
          // Desembaraçado: alíquota sai do denominador e vira termo constante no numerador!
          fixedNumerator += overrideVal
        } else {
          const pct = percentValueOf(cost, subtotal) / 100
          if (cost.method === 'tax') {
            const weight = safe(cost.taxWeight, 100) / 100
            remainingTaxSum += pct * weight
          } else {
            remainingRateSum += pct
          }
        }
        continue
      }

      if (isFixedLikeMethod(cost.method)) {
        if (isOverridden) {
          fixedNumerator += overrideVal
        } else {
          fixedNumerator += fixedAmountOf(cost, kitPrice)
        }
      }
    }

    // Denominador restante
    // Em modelo direto: Denom = 1 - remainingRateSum - remainingTaxSum - remainingMarginSum
    // Em modelo intermediado: imposto não incide sobre o Kit.
    // Venda = (fixed_sem_kit + (1 - T)*Kit + desembaraçados) / (1 - R - T - M)
    const totalRemainingRate = remainingRateSum + remainingTaxSum + remainingMarginSum
    const denominator = 1 - totalRemainingRate

    if (denominator <= 0.001) {
      denominatorWarning = `Soma das alíquotas restantes (${(totalRemainingRate * 100).toFixed(2)}%) é igual ou superior a 100%. A equação não possui solução positiva.`
      if (typeof input.onDenominatorWarning === 'function') {
        try {
          input.onDenominatorWarning(denominatorWarning)
        } catch {
          /* ignore */
        }
      }
      return null
    }

    if (intermediated && remainingTaxSum > 0) {
      // Numerador ajustado para intermediado:
      // Venda = (outros_fixos + desembaraçados + (1 - remainingTaxSum)*Kit) / denominator
      const nonKitFixed = fixedNumerator - kitPrice
      calculatedBaseSale = (nonKitFixed + (1 - remainingTaxSum) * kitPrice) / denominator
    } else {
      calculatedBaseSale = fixedNumerator / denominator
    }
  }

  const effectiveBaseSale = shouldRecomputeBase ? calculatedBaseSale : subtotal

  let finalTotal: number
  let discountValue: number
  let discountPercent: number

  if (typeof input.targetSalePrice === 'number' && Number.isFinite(input.targetSalePrice)) {
    finalTotal = input.targetSalePrice
    discountValue = effectiveBaseSale - finalTotal
    discountPercent = effectiveBaseSale > 0 ? (discountValue / effectiveBaseSale) * 100 : 0
  } else {
    const rawPct =
      typeof input.discountPercent === 'number' && Number.isFinite(input.discountPercent)
        ? input.discountPercent
        : 0
    if (rawPct < 0) return null
    discountPercent = rawPct
    const scale = 1 - safe(discountPercent) / 100
    finalTotal = effectiveBaseSale * scale
    discountValue = effectiveBaseSale - finalTotal
  }

  // Base de imposto
  const taxBaseOf = (sale: number) => (intermediated ? Math.max(0, sale - kitPrice) : sale)

  const detail: DiscountRecalcResult['detail'] = []
  const outCosts: AppliedCostLike[] = costs.map((c) => ({ ...c }))

  const decompose = (sale: number) => {
    let percentCosts = 0
    let fixedCosts = 0

    if (costs.length > 0) {
      for (let i = 0; i < costs.length; i++) {
        const cost = costs[i]
        const isOverridden = cost.name ? overrideMap.has(cost.name) : false
        const manualAmount = isOverridden ? overrideMap.get(cost.name!)! : null

        if (cost.method === 'margin') continue
        if (cost.method === 'kit') continue

        if (isPercentOfSaleMethod(cost.method)) {
          if (isOverridden && manualAmount !== null) {
            // Item desembaraçado vira CONSTANTE no cálculo
            fixedCosts += manualAmount
            const implicitRate = sale > 0 ? (manualAmount / sale) * 100 : 0
            if (sale === finalTotal) {
              outCosts[i].calculatedAmount = manualAmount
              outCosts[i].manualFixedAmount = manualAmount
              outCosts[i].implicitRate = implicitRate
              outCosts[i].isOverridden = true
              detail.push({
                name: cost.name || cost.method,
                label: `Fixo manual R$ ${manualAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (alíquota implícita: ${implicitRate.toFixed(2)}%)`,
                amount: manualAmount,
                base: 'fixed',
                implicitRate,
                isManual: true,
              })
            }
          } else {
            const pctValue = percentValueOf(cost, effectiveBaseSale)
            let amount: number
            if (cost.method === 'tax') {
              const weight = safe(cost.taxWeight, 100) / 100
              amount = taxBaseOf(sale) * (pctValue / 100) * weight
            } else {
              amount = sale * (pctValue / 100)
            }
            percentCosts += amount
            if (sale === finalTotal) {
              outCosts[i].calculatedAmount = amount
              detail.push({
                name: cost.name || cost.method,
                label:
                  cost.method === 'tax'
                    ? `${pctValue.toFixed(2)}%${safe(cost.taxWeight, 100) !== 100 ? ` (peso ${safe(cost.taxWeight)}%)` : ''} s/ venda`
                    : `${pctValue.toFixed(2)}% s/ venda`,
                amount,
                base: 'final_total',
              })
            }
          }
          continue
        }

        if (isFixedLikeMethod(cost.method)) {
          const amount =
            isOverridden && manualAmount !== null ? manualAmount : fixedAmountOf(cost, kitPrice)
          fixedCosts += amount
          if (sale === finalTotal) {
            outCosts[i].calculatedAmount = amount
            if (isOverridden) {
              outCosts[i].manualFixedAmount = manualAmount
              outCosts[i].isOverridden = true
            }
            detail.push({
              name: cost.name || cost.method,
              label:
                cost.method === 'kit_percent'
                  ? `${safe(cost.value).toFixed(2)}% s/ kit`
                  : isOverridden
                    ? 'Valor fixo manual'
                    : 'Valor fixo',
              amount,
              base: cost.method === 'kit_percent' ? 'kit' : 'fixed',
              isManual: isOverridden,
            })
          }
        }
      }
      fixedCosts += kitPrice
    } else {
      // Fallback sem appliedCosts
      const denominator = 1 - aggPercent - marginSumVal
      percentCosts =
        sale * (safe(pricing.rateSum) + safe(pricing.commissionSum)) +
        taxBaseOf(sale) * safe(pricing.taxSum)
      fixedCosts =
        effectiveBaseSale * denominator + (intermediated ? safe(pricing.taxSum) * kitPrice : 0)
      if (sale === finalTotal) {
        detail.push({
          name: 'percentuais_agregados',
          label: 'Taxas + impostos + comissões',
          amount: percentCosts,
          base: 'final_total',
        })
      }
    }

    const costsTotal = percentCosts + fixedCosts
    const marginAmount = sale - costsTotal
    const marginPct = sale > 0 ? marginAmount / sale : 0
    return { percentCosts, fixedCosts, costsTotal, marginAmount, marginPct }
  }

  const discounted = decompose(finalTotal)
  const base = decompose(effectiveBaseSale)

  return {
    baseTotal: effectiveBaseSale,
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
    denominatorWarning,
  }
}
