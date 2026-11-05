import { describe, it, expect } from 'vitest'
import { recalcPricingWithDiscount, isPercentOfSaleMethod, PricingLike } from '../discount-recalc'

/**
 * Exemplo do usuário: margem 20%, comissão 4%, imposto 15%. Custos que não
 * dependem do valor de venda = 20.000. Antes do desconto sobram 39% para
 * distribuir → venda_base = 20.000 / 0,61 ≈ 32.786,885.
 * Com desconto de 5%: venda_final = 31.147,54; imposto = 4.672,13;
 * comissão = 1.245,90; margem = 5.229,51 → 16,79% da venda com desconto.
 */
const USER_EXAMPLE = {
  subtotal: 20000 / 0.61,
  appliedCosts: [
    { name: 'Impostos', method: 'tax' as const, value: 15, taxWeight: 100 },
    { name: 'Comissão', method: 'commission' as const, value: 4 },
    { name: 'Margem', method: 'margin' as const, value: 20 },
    { name: 'Kit', method: 'fixed' as const, value: 20000, amount: 20000 },
  ],
}

describe('recalcPricingWithDiscount — exemplo do usuário', () => {
  it('margem ≈ 16,79% com desconto de 5% (imposto e comissão sobre a venda descontada)', () => {
    const r = recalcPricingWithDiscount({
      subtotal: USER_EXAMPLE.subtotal,
      discountPercent: 5,
      pricing: { appliedCosts: USER_EXAMPLE.appliedCosts, kitPrice: 0 },
    })
    expect(r).not.toBeNull()
    expect(r!.finalTotal).toBeCloseTo((20000 / 0.61) * 0.95, 6)
    // imposto 15% sobre 31.147,54 = 4.672,13
    expect(r!.percentCostsTotal).toBeCloseTo(
      (20000 / 0.61) * 0.95 * 0.15 + (20000 / 0.61) * 0.95 * 0.04,
      6,
    )
    expect(r!.costsTotal).toBeCloseTo(20000 + r!.percentCostsTotal, 6)
    expect(r!.marginAmount).toBeCloseTo(r!.finalTotal - 20000 - r!.percentCostsTotal, 6)
    // 16,79% da venda com desconto
    expect(r!.marginPct * 100).toBeCloseTo(16.79, 2)
    // margem sem desconto = 20% (batendo com o motor)
    expect(r!.baseMarginPct * 100).toBeCloseTo(20, 6)
  })

  it('desconto 0 devolve a decomposição original (margem 20%)', () => {
    const r = recalcPricingWithDiscount({
      subtotal: USER_EXAMPLE.subtotal,
      discountPercent: 0,
      pricing: { appliedCosts: USER_EXAMPLE.appliedCosts, kitPrice: 0 },
    })
    expect(r).not.toBeNull()
    expect(r!.finalTotal).toBeCloseTo(USER_EXAMPLE.subtotal, 6)
    expect(r!.marginPct * 100).toBeCloseTo(20, 4)
    expect(r!.marginAmount).toBeCloseTo(USER_EXAMPLE.subtotal * 0.2, 4)
  })

  it('desconto grande → margem NEGATIVA (sem travamento em zero)', () => {
    // desconto de 20%: venda_final = 26.229,51; percentuais = 19,55% disso
    const r = recalcPricingWithDiscount({
      subtotal: USER_EXAMPLE.subtotal,
      discountPercent: 20,
      pricing: { appliedCosts: USER_EXAMPLE.appliedCosts, kitPrice: 0 },
    })
    expect(r).not.toBeNull()
    expect(r!.marginAmount).toBeLessThan(0)
    expect(r!.marginPct).toBeLessThan(0)
  })

  it('kit entra no custo UMA única vez (method kit não duplica com kitPrice)', () => {
    const r = recalcPricingWithDiscount({
      subtotal: USER_EXAMPLE.subtotal,
      discountPercent: 5,
      pricing: {
        appliedCosts: [
          { name: 'Kit', method: 'kit' as const, value: 0, amount: 20000 },
          { name: 'Impostos', method: 'tax' as const, value: 15 },
          { name: 'Comissão', method: 'commission' as const, value: 4 },
          { name: 'Margem', method: 'margin' as const, value: 20 },
        ],
        kitPrice: 20000,
      },
    })
    expect(r).not.toBeNull()
    expect(r!.fixedCostsTotal).toBeCloseTo(20000, 6)
    expect(r!.marginPct * 100).toBeCloseTo(16.79, 2)
  })

  it('margem original via mesmo módulo (desconto 0) — Mesma base para Edição e Custos', () => {
    const withDiscount = recalcPricingWithDiscount({
      subtotal: 1000,
      discountPercent: 10,
      pricing: { appliedCosts: USER_EXAMPLE.appliedCosts, kitPrice: 0 },
    })
    const withoutDiscount = recalcPricingWithDiscount({
      subtotal: 1000,
      discountPercent: 0,
      pricing: { appliedCosts: USER_EXAMPLE.appliedCosts, kitPrice: 0 },
    })
    expect(withDiscount!.baseMarginAmount).toBeCloseTo(withoutDiscount!.marginAmount, 9)
    expect(withDiscount!.baseMarginPct).toBeCloseTo(withoutDiscount!.marginPct, 9)
  })
})

describe('fallback com somas agregadas (snapshot antigo, sem appliedCosts)', () => {
  it('margem = resto com percentuais sobre a venda descontada', () => {
    const r = recalcPricingWithDiscount({
      subtotal: 100000,
      discountPercent: 5,
      pricing: { rateSum: 0.04, taxSum: 0.15, marginSum: 0.2, kitPrice: 20000 },
    })
    expect(r).not.toBeNull()
    // venda_final = 95.000; percentuais = 14.250 + 3.800 = 18.050
    expect(r!.percentCostsTotal).toBeCloseTo(18050, 4)
    // margem = 95.000 − 20.000 − 18.050 = 56.950 (59,95% da venda c/ desconto)
    expect(r!.marginAmount).toBeCloseTo(56950, 4)
  })
})

describe('isPercentOfSaleMethod', () => {
  it('tax, rate e commission incidem sobre a venda; margin e fixos não', () => {
    expect(isPercentOfSaleMethod('tax')).toBe(true)
    expect(isPercentOfSaleMethod('rate')).toBe(true)
    expect(isPercentOfSaleMethod('commission')).toBe(true)
    expect(isPercentOfSaleMethod('margin')).toBe(false)
    expect(isPercentOfSaleMethod('fixed')).toBe(false)
    expect(isPercentOfSaleMethod('kit_percent')).toBe(false)
    expect(isPercentOfSaleMethod('kit')).toBe(false)
  })
})

describe('targetSalePrice direto', () => {
  it('permite recalcular especificando targetSalePrice diretamente', () => {
    const res = recalcPricingWithDiscount({
      subtotal: 100000,
      targetSalePrice: 95000,
      pricing: { rateSum: 0.04, taxSum: 0.15, marginSum: 0.2, kitPrice: 20000 },
    })
    expect(res).not.toBeNull()
    expect(res?.finalTotal).toBe(95000)
    expect(res?.discountValue).toBe(5000)
    expect(res?.discountPercent).toBe(5)
    expect(res?.percentCostsTotal).toBeCloseTo(18050, 4)
    expect(res?.marginAmount).toBeCloseTo(56950, 4)
  })

  it('permite targetSalePrice sem desconto (igual ao subtotal)', () => {
    const res = recalcPricingWithDiscount({
      subtotal: 100000,
      targetSalePrice: 100000,
      pricing: { rateSum: 0.04, taxSum: 0.15, marginSum: 0.2, kitPrice: 20000 },
    })
    expect(res).not.toBeNull()
    expect(res?.finalTotal).toBe(100000)
    expect(res?.discountPercent).toBe(0)
    expect(res?.discountValue).toBe(0)
  })
})

describe('Edição manual de custos em R$ (desembaraçamento de variáveis no motor 2)', () => {
  it('exemplo numérico do usuário: kit+fixos 20.000, margem 20%, comissão 4%, imposto 15%, comissão editada para 900', () => {
    // Venda original = 20.000 / (1 - 0.20 - 0.04 - 0.15) = 20.000 / 0.61 = 32.786,8852...
    const originalSubtotal = 20000 / 0.61
    const pricing: PricingLike = {
      kitPrice: 20000,
      marginSum: 0.2,
      appliedCosts: [
        { name: 'Comissão', method: 'commission', value: 4 },
        { name: 'Impostos', method: 'tax', value: 15, taxWeight: 100 },
        { name: 'Margem', method: 'margin', value: 20 },
      ],
    }

    const res = recalcPricingWithDiscount({
      subtotal: originalSubtotal,
      pricing,
      costOverrides: {
        Comissão: 900,
      },
    })

    expect(res).not.toBeNull()
    // Nova Venda = (20.000 + 900) / (1 - 0.20 - 0.15) = 20.900 / 0.65 = 32.153,846...
    expect(res!.finalTotal).toBeCloseTo(32153.85, 2)
    // Margem = 32.153,85 * 0.20 = 6.430,77
    expect(res!.marginAmount).toBeCloseTo(6430.77, 2)

    // Detalhe do custo Comissão: deve ser exatamente 900
    const comissaoItem = res!.appliedCosts.find((c) => c.name === 'Comissão')
    expect(comissaoItem?.calculatedAmount).toBe(900)
    expect(comissaoItem?.manualFixedAmount).toBe(900)
    // Alíquota implícita gravada: 900 / 32.153,85 = 2.80%
    expect(comissaoItem?.implicitRate).toBeCloseTo(2.8, 2)

    // Imposto restante: 15% de 32.153,85 = 4.823,08
    const impostoItem = res!.appliedCosts.find((c) => c.name === 'Impostos')
    expect(impostoItem?.calculatedAmount).toBeCloseTo(4823.08, 2)

    // Soma fecha no centavo: 20.000 + 900 + 4.823,08 + 6.430,77 = 32.153,85
    const totalSoma = 20000 + 900 + impostoItem!.calculatedAmount! + res!.marginAmount
    expect(totalSoma).toBeCloseTo(res!.finalTotal, 2)
  })

  it('guard do denominador: se alíquotas restantes somam >= 100%, bloqueia', () => {
    const pricing: PricingLike = {
      kitPrice: 20000,
      marginSum: 0.5,
      appliedCosts: [
        { name: 'Taxa A', method: 'rate', value: 30 },
        { name: 'Taxa B', method: 'rate', value: 20 },
        { name: 'Comissão', method: 'commission', value: 10 },
      ],
    }
    // remaining = 0.50 + 0.30 + 0.20 = 1.00 (100%) quando comissão é editada
    const res = recalcPricingWithDiscount({
      subtotal: 50000,
      pricing,
      costOverrides: {
        Comissão: 100,
      },
    })
    expect(res).toBeNull()
  })

  it('permite sobrescrita de item fixo em R$ recalculando a venda base', () => {
    const pricing: PricingLike = {
      kitPrice: 10000,
      marginSum: 0.2,
      appliedCosts: [
        { name: 'Engenharia', method: 'fixed', value: 1000 },
        { name: 'Imposto', method: 'tax', value: 10 },
      ],
    }
    // original: (10000 + 1000) / 0.7 = 11000 / 0.7 = 15714.28
    // com Engenharia = 2000: (10000 + 2000) / 0.7 = 12000 / 0.7 = 17142.86
    const res = recalcPricingWithDiscount({
      subtotal: 11000 / 0.7,
      pricing,
      costOverrides: {
        Engenharia: 2000,
      },
    })
    expect(res).not.toBeNull()
    expect(res!.finalTotal).toBeCloseTo(17142.86, 2)
    const engItem = res!.appliedCosts.find((c) => c.name === 'Engenharia')
    expect(engItem?.calculatedAmount).toBe(2000)
  })
})
