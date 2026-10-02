import { describe, it, expect } from 'vitest'
import { annualToMonthlyRate, calculatePriceSimulation } from '../price-calculator'

describe('Price Table Simulator', () => {
  it('converts annual rate to equivalent monthly rate correctly', () => {
    // 12% a.a. => (1 + 0.12)^(1/12) - 1 ≈ 0.00948879 (0.9489% a.m.)
    const monthlyRate = annualToMonthlyRate(12)
    expect(monthlyRate).toBeCloseTo(0.00948879, 5)
  })

  it('calculates zero interest simulation', () => {
    const result = calculatePriceSimulation({
      financedAmount: 12000,
      annualRatePct: 0,
      installments: 12,
      downPayment: 3000,
      totalNegotiationValue: 15000,
    })

    expect(result.monthlyPayment).toBe(1000)
    expect(result.totalInterest).toBe(0)
    expect(result.totalPaid).toBe(15000)
    expect(result.totalFinancedPaid).toBe(12000)
  })

  it('calculates Price amortization for solar system', () => {
    // R$ 30.000 financiado em 60x a 15% a.a.
    const result = calculatePriceSimulation({
      financedAmount: 30000,
      annualRatePct: 15,
      installments: 60,
      downPayment: 5000,
    })

    expect(result.monthlyPayment).toBeGreaterThan(650)
    expect(result.monthlyPayment).toBeLessThan(750)
    expect(result.totalPaid).toBeGreaterThan(35000)
    expect(result.totalInterest).toBeGreaterThan(10000)
  })
})
