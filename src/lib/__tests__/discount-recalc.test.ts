import { describe, it, expect } from 'vitest'
import { recalcPricingWithDiscount, isPercentOfSaleMethod } from '../discount-recalc'
import type { PricingLike } from '../discount-recalc'

const basePricing: PricingLike = {
  kitPrice: 10000,
  marginSum: 0.25,
  appliedCosts: [
    {
      name: 'Impostos',
      method: 'tax',
      value: 10,
      taxWeight: 100,
      calculatedAmount: 2000,
    },
    { name: 'Comissão', method: 'commission', value: 5, calculatedAmount: 1000 },
    { name: 'Frete', method: 'fixed', calculatedAmount: 500 },
    { name: 'Insumos', method: 'kit_percent', value: 2, calculatedAmount: 200 },
  ],
}

describe('recalcPricingWithDiscount', () => {
  it('sem desconto mantém os valores originais', () => {
    const r = recalcPricingWithDiscount({
      subtotal: 20000,
      discountPercent: 0,
      pricing: basePricing,
    })
    expect(r).not.toBeNull()
    expect(r!.finalTotal).toBe(20000)
    expect(r!.percentCostsTotal).toBeCloseTo(3000)
    expect(r!.costsTotal).toBeCloseTo(11700)
    expect(r!.marginAmount).toBeCloseTo(8300)
  })

  it('com desconto, percentuais incidem sobre o valor já descontado', () => {
    const r = recalcPricingWithDiscount({
      subtotal: 20000,
      discountPercent: 10,
      pricing: basePricing,
    })
    expect(r!.finalTotal).toBe(18000)
    // imposto 10% × peso 100% sobre 18000 = 1800; comissão 5% sobre 18000 = 900
    expect(r!.percentCostsTotal).toBeCloseTo(2700)
    // fixos permanecem: kit 10000 + frete 500 + insumos 200 = 10700
    expect(r!.fixedCostsTotal).toBeCloseTo(10700)
    expect(r!.costsTotal).toBeCloseTo(13400)
    // margem real = 18000 − 13400 = 4600 (≈ 25,56%)
    expect(r!.marginAmount).toBeCloseTo(4600)
    expect(r!.marginPct).toBeCloseTo(4600 / 18000)
  })

  it('imposto com peso incide proporcionalmente sobre a base descontada', () => {
    const pricing: PricingLike = {
      kitPrice: 0,
      appliedCosts: [
        { name: 'ICMS', method: 'tax', value: 12, taxWeight: 50, calculatedAmount: 600 },
      ],
    }
    const r = recalcPricingWithDiscount({ subtotal: 10000, discountPercent: 20, pricing })
    // base = 8000; 12% × 50% = 480
    expect(r!.percentCostsTotal).toBeCloseTo(480)
    expect(r!.marginAmount).toBeCloseTo(8000 - 480)
  })

  it('modelo intermediado: imposto incide sobre venda_final − kit', () => {
    const r = recalcPricingWithDiscount({
      subtotal: 20000,
      discountPercent: 10,
      pricing: basePricing,
      billingModel: 'intermediated',
    })
    // base imposto = 18000 − 10000 = 8000 → 10% = 800; comissão 5% × 18000 = 900
    expect(r!.percentCostsTotal).toBeCloseTo(1700)
  })

  it('não altera custos-base originais no snapshot retornado', () => {
    const r = recalcPricingWithDiscount({
      subtotal: 20000,
      discountPercent: 10,
      pricing: basePricing,
    })
    const imposto = r!.appliedCosts.find((c) => c.name === 'Impostos')!
    expect(imposto.value).toBe(10) // taxa original intacta
    expect(imposto.calculatedAmount).toBeCloseTo(1800) // valor recalculado
    const frete = r!.appliedCosts.find((c) => c.name === 'Frete')!
    expect(frete.calculatedAmount).toBe(500)
  })

  it('retorna null quando não há custos aplicados (não inventa cálculo)', () => {
    expect(recalcPricingWithDiscount({ subtotal: 100, discountPercent: 5, pricing: {} })).toBeNull()
  })

  it('isPercentOfSaleMethod classifica corretamente', () => {
    expect(isPercentOfSaleMethod('tax')).toBe(true)
    expect(isPercentOfSaleMethod('rate')).toBe(true)
    expect(isPercentOfSaleMethod('commission')).toBe(true)
    expect(isPercentOfSaleMethod('fixed')).toBe(false)
    expect(isPercentOfSaleMethod('kit_percent')).toBe(false)
    expect(isPercentOfSaleMethod('margin')).toBe(false)
  })
})
