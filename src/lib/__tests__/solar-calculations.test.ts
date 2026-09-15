import { describe, it, expect } from 'vitest'
import {
  calculateConsumptionCoverage,
  calculateOccupiedArea,
  calculateCo2Avoided,
  calculateInvestmentMultiple,
  calculateTir,
  calculateSavings25Years,
  extractValidityDays,
  formatProposalDate,
  extractEstimatedMonthlyGeneration,
  BRAZIL_GRID_EMISSION_FACTOR,
} from '../solar-calculations'

describe('solar-calculations', () => {
  describe('calculateConsumptionCoverage', () => {
    it('deve calcular a cobertura corretamente (624 / 500 -> 124.8%)', () => {
      const coverage = calculateConsumptionCoverage(624, 500)
      expect(coverage).toBe(124.8)
    })

    it('deve retornar 0 para consumo zero ou inválido', () => {
      expect(calculateConsumptionCoverage(500, 0)).toBe(0)
      expect(calculateConsumptionCoverage(0, 500)).toBe(0)
      expect(calculateConsumptionCoverage(-10, 500)).toBe(0)
    })
  })

  describe('calculateOccupiedArea', () => {
    it('deve calcular área com dimensões em mm (ex: 2278 x 1134 mm) convertendo para metros', () => {
      // 2.278m * 1.134m = 2.583252 m² * 12 ≈ 31.0 m²
      const area = calculateOccupiedArea(12, { height: 2278, width: 1134 })
      expect(area).toBe(31.0)
    })

    it('deve calcular área com dimensões já em metros', () => {
      const area = calculateOccupiedArea(10, { height: 2.0, width: 1.0 })
      expect(area).toBe(20.0)
    })

    it('deve usar fallback padrão se dimensões estiverem ausentes', () => {
      // 10 * 2.58 = 25.8
      const area = calculateOccupiedArea(10, null)
      expect(area).toBe(25.8)
    })

    it('deve retornar 0 se quantidade for <= 0', () => {
      expect(calculateOccupiedArea(0, { height: 2, width: 1 })).toBe(0)
    })
  })

  describe('calculateCo2Avoided', () => {
    it('deve calcular emissão de CO2 evitada com a constante BRAZIL_GRID_EMISSION_FACTOR', () => {
      expect(BRAZIL_GRID_EMISSION_FACTOR).toBe(0.0000385)
      // Para geração mensal de 624 kWh:
      // anual = 624 * 12 = 7488 kWh
      // 7488 * 0.0000385 = 0.288288 ≈ 0.29 t
      const co2 = calculateCo2Avoided(624)
      expect(co2).toBe(0.29)
    })

    it('deve retornar 0 para geração <= 0', () => {
      expect(calculateCo2Avoided(0)).toBe(0)
      expect(calculateCo2Avoided(-100)).toBe(0)
    })
  })

  describe('calculateInvestmentMultiple', () => {
    it('deve calcular múltiplo do investimento (103357.8 / 9169.17 -> ~11.3x)', () => {
      const mult = calculateInvestmentMultiple(103357.8, 9169.17)
      expect(mult).toBe(11.3)
    })

    it('deve retornar 0 se investimento for <= 0', () => {
      expect(calculateInvestmentMultiple(10000, 0)).toBe(0)
      expect(calculateInvestmentMultiple(0, 10000)).toBe(0)
    })
  })

  describe('calculateTir', () => {
    it('deve calcular TIR plausível (~45%) para o caso exemplo (investimento ~9169.17, economia anual ~4134.31)', () => {
      const tir = calculateTir(9169.17, 4134.312, 25)
      // Payback simples é ~2.2 anos, TIR em 25 anos fica entre 44% e 46%
      expect(tir).toBeGreaterThan(40)
      expect(tir).toBeLessThan(50)
      expect(tir).toBeCloseTo(45.1, 0)
    })

    it('deve retornar 0 para investimentos onde a economia total não cobre o investimento', () => {
      const tir = calculateTir(100000, 1000, 25) // 1000 * 25 = 25000 < 100000
      expect(tir).toBe(0)
    })

    it('deve retornar 0 para entradas inválidas', () => {
      expect(calculateTir(0, 1000, 25)).toBe(0)
      expect(calculateTir(10000, 0, 25)).toBe(0)
    })
  })

  describe('calculateSavings25Years', () => {
    it('deve calcular economia em 25 anos a partir da economia anual', () => {
      expect(calculateSavings25Years(4134.312)).toBe(103357.8)
    })

    it('deve calcular a partir da economia mensal quando anual não for fornecida', () => {
      // 344.526 * 12 * 25 = 103357.8
      expect(calculateSavings25Years(undefined, 344.526)).toBe(103357.8)
    })
  })

  describe('extractValidityDays', () => {
    it('deve rejeitar formato de texto livre/data por extenso e extrair número correto', () => {
      expect(extractValidityDays(15)).toBe(15)
      expect(extractValidityDays('15')).toBe(15)
      expect(extractValidityDays('15 dias')).toBe(15)
      expect(extractValidityDays('30 DIAS')).toBe(30)
    })

    it('deve calcular diferença de dias se receber data ISO', () => {
      const refDate = '2026-03-01T00:00:00Z'
      const targetDate = '2026-03-16T00:00:00Z'
      const days = extractValidityDays(targetDate, refDate)
      expect(days).toBe(15)
    })

    it('deve calcular diferença de dias se receber data no padrão DD/MM/AAAA', () => {
      const refDate = new Date(2026, 2, 1) // 01/03/2026
      const targetDate = '16/03/2026'
      const days = extractValidityDays(targetDate, refDate)
      expect(days).toBe(15)
    })

    it('deve retornar fallback se valor estiver vazio ou ausente', () => {
      expect(extractValidityDays(null, null, 10)).toBe(10)
      expect(extractValidityDays('', null, 10)).toBe(10)
      expect(extractValidityDays(undefined, null, 10)).toBe(10)
    })
  })

  describe('formatProposalDate', () => {
    it('deve formatar data em DD/MM/AAAA', () => {
      const d = new Date(2026, 2, 28) // 28 de março de 2026
      expect(formatProposalDate(d)).toBe('28/03/2026')
    })

    it('deve formatar string ISO em DD/MM/AAAA', () => {
      const formatted = formatProposalDate('2026-03-28T12:00:00Z')
      expect(formatted).toMatch(/^\d{2}\/\d{2}\/2026$/)
    })
  })

  describe('extractEstimatedMonthlyGeneration', () => {
    it('deve extrair diretamente se o campo estimated_monthly_generation existir', () => {
      const res = extractEstimatedMonthlyGeneration({ estimated_monthly_generation: 624 })
      expect(res).toBe(624)
    })

    it('deve extrair via média dos 12 meses individuais se o campo direto estiver ausente', () => {
      const sizing = {
        jan: 600,
        feb: 620,
        mar: 610,
        apr: 590,
        may: 550,
        jun: 500,
        jul: 520,
        aug: 580,
        sep: 610,
        oct: 630,
        nov: 640,
        dec: 650,
      }
      // Média: (600+620+610+590+550+500+520+580+610+630+640+650) / 12 = 7100 / 12 = 591.666... ≈ 591.7
      const res = extractEstimatedMonthlyGeneration(sizing)
      expect(res).toBe(591.7)
    })

    it('deve calcular fallback via potência x HSP se não houver meses', () => {
      // 5 kWp * 4.5 HSP * 30 dias * 0.8 = 540 kWh
      const res = extractEstimatedMonthlyGeneration({}, 5, 4.5)
      expect(res).toBe(540)
    })
  })
})
