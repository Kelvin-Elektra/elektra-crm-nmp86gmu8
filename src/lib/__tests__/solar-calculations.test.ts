import { describe, it, expect } from 'vitest'
import {
  calculateConsumptionCoverage,
  calculateOccupiedArea,
  calculateCo2Avoided,
  calculateInvestmentMultiple,
  calculateTir,
  calculateSavings25Years,
  calculateYearlySavingsTable,
  generateSavingsProjection,
  extractValidityDays,
  formatProposalDate,
  extractEstimatedMonthlyGeneration,
  BRAZIL_GRID_EMISSION_FACTOR,
  buildEquipmentsArray,
  buildCommercialConditionsArray,
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

  describe('calculateYearlySavingsTable e generateSavingsProjection com números reais do usuário', () => {
    // Caso real: consumo 500, geração 546, investimento R$ 9.169,17, economia mensal R$ 344,53, economia anual ~R$ 4.134,36
    const annualSavings = 4134.36
    const totalInvestment = 9169.17

    it('calculateYearlySavingsTable deve gerar 25 anos com colunas corretas e saldo após investimento', () => {
      const table = calculateYearlySavingsTable(annualSavings, totalInvestment, 25)
      expect(table).toHaveLength(25)

      // Ano 1
      expect(table[0].year).toBe(1)
      expect(table[0].annualSavings).toBe(4134.36)
      expect(table[0].cumulativeSavings).toBe(4134.36)
      expect(table[0].balanceWithInvestment).toBe(Number((4134.36 - totalInvestment).toFixed(2))) // -5034.81

      // Ano 3 (acumulado = 12403.08 > 9169.17, saldo positivo)
      expect(table[2].year).toBe(3)
      expect(table[2].cumulativeSavings).toBe(12403.08)
      expect(table[2].balanceWithInvestment).toBe(Number((12403.08 - totalInvestment).toFixed(2))) // +3233.91

      // Ano 5: 4134.36 * 5 = 20671.80
      expect(table[4].year).toBe(5)
      expect(table[4].cumulativeSavings).toBe(20671.8)
      expect(table[4].balanceWithInvestment).toBe(Number((20671.8 - totalInvestment).toFixed(2))) // +11502.63

      // Ano 25: 4134.36 * 25 = 103359.00
      expect(table[24].year).toBe(25)
      expect(table[24].cumulativeSavings).toBe(103359.0)
      expect(table[24].balanceWithInvestment).toBe(Number((103359.0 - totalInvestment).toFixed(2))) // +94189.83
    })

    it('generateSavingsProjection deve gerar os 6 marcos oficiais (Anos 1, 5, 10, 15, 20 e 25)', () => {
      const projection = generateSavingsProjection(annualSavings)
      expect(projection).toHaveLength(6)

      expect(projection[0]).toEqual({
        year: 1,
        label: 'Ano 1',
        annualSavings: 4134.36,
        cumulativeSavings: 4134.36,
      })

      // Ano 5 = R$ 20.671,80
      expect(projection[1]).toEqual({
        year: 5,
        label: 'Ano 5',
        annualSavings: 4134.36,
        cumulativeSavings: 20671.8,
      })

      // Ano 10 = R$ 41.343,60
      expect(projection[2]).toEqual({
        year: 10,
        label: 'Ano 10',
        annualSavings: 4134.36,
        cumulativeSavings: 41343.6,
      })

      // Ano 15 = R$ 62.015,40
      expect(projection[3]).toEqual({
        year: 15,
        label: 'Ano 15',
        annualSavings: 4134.36,
        cumulativeSavings: 62015.4,
      })

      // Ano 20 = R$ 82.687,20
      expect(projection[4]).toEqual({
        year: 20,
        label: 'Ano 20',
        annualSavings: 4134.36,
        cumulativeSavings: 82687.2,
      })

      // Ano 25 = R$ 103.359,00
      expect(projection[5]).toEqual({
        year: 25,
        label: 'Ano 25',
        annualSavings: 4134.36,
        cumulativeSavings: 103359.0,
      })
    })

    it('métricas financeiras derivadas (TIR, Múltiplo, Payback) com o caso real do usuário', () => {
      const multiple = calculateInvestmentMultiple(103359.0, totalInvestment)
      // 103359 / 9169.17 ≈ 11.27 -> 11.3
      expect(multiple).toBe(11.3)

      const tir = calculateTir(totalInvestment, annualSavings, 25)
      // Com ~4134.36 de economia anual e ~9169.17 de investimento, TIR fica ~45.1%
      expect(tir).toBeGreaterThan(44)
      expect(tir).toBeLessThan(46)
      expect(tir).toBeCloseTo(45.1, 0)
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

  describe('buildEquipmentsArray (Build 3)', () => {
    it('deve montar array com módulos, inversores e insumos com garantia traço "-"', () => {
      const equipments = buildEquipmentsArray({
        module: {
          name: 'DHM-T72X10/FS(BB) 555W',
          brand: 'DAH Solar',
          power: 555,
          warranty: '25 anos',
        },
        moduleQty: 15,
        inverters: [
          {
            name: 'SUN2000-8KTL-M1',
            brand: 'Huawei',
            power: 8,
            voltage: '220V',
            qty: 1,
            warranty: '10 anos',
          },
        ],
        supplies: [
          {
            name: 'Estrutura de Fixação Telhado Cerâmico',
            specification: 'Alumínio Anodizado',
            qty: 1,
            type: 'supply',
          },
          {
            name: 'Cabo Solar Preto 6mm²',
            specification: 'Material de Instalação e Proteção',
            qty: 50,
            type: 'supply',
          },
        ],
      })

      expect(equipments).toHaveLength(4)

      // 1. Módulos
      expect(equipments[0]).toEqual({
        item: 'DAH Solar DHM-T72X10/FS(BB) 555W',
        especificacao: '555W',
        qtd: 15,
        garantia: '25 anos',
      })

      // 2. Inversor
      expect(equipments[1]).toEqual({
        item: 'Huawei SUN2000-8KTL-M1',
        especificacao: '8 kW · 220V',
        qtd: 1,
        garantia: '10 anos',
      })

      // 3. Insumos (garantia "-")
      expect(equipments[2]).toEqual({
        item: 'Estrutura de Fixação Telhado Cerâmico',
        especificacao: 'Alumínio Anodizado',
        qtd: 1,
        garantia: '-',
      })

      expect(equipments[3]).toEqual({
        item: 'Cabo Solar Preto 6mm²',
        especificacao: 'Material de Instalação e Proteção',
        qtd: 50,
        garantia: '-',
      })
    })

    it('deve omitir inversores sem quebrar se a lista for vazia ou nula', () => {
      const equipments = buildEquipmentsArray({
        module: {
          name: 'Painel 550W',
          brand: 'Canadian',
          power: 550,
        },
        moduleQty: 10,
        inverters: [],
        supplies: [
          {
            name: 'Conector MC4',
            qty: 4,
          },
        ],
      })

      expect(equipments).toHaveLength(2)
      expect(equipments[0].item).toBe('Canadian Painel 550W')
      expect(equipments[0].qtd).toBe(10)
      expect(equipments[0].garantia).toBe('25 anos') // fallback padrão

      expect(equipments[1].item).toBe('Conector MC4')
      expect(equipments[1].garantia).toBe('-')
    })
  })

  describe('buildCommercialConditionsArray (Build 3)', () => {
    it('deve montar as 5 condições exigidas pelo template com dados da negociação', () => {
      const conditions = buildCommercialConditionsArray({
        paymentTerms: 'À vista com 5% ou financiado',
        definedPaymentMethod: 'PIX à vista',
        acceptedPaymentMethods: ['PIX', 'Financiamento Santander'],
        validityDays: 15,
        installationLeadTime: '30 dias',
        moduleWarranty: '25',
        inverterWarranty: '10',
      })

      expect(conditions).toHaveLength(5)
      expect(conditions[0]).toEqual({
        item: 'Pagamento',
        condicao: 'PIX à vista (À vista com 5% ou financiado)',
      })
      expect(conditions[1].item).toBe('Financiamento')
      expect(conditions[1].condicao).toContain('Santander')
      expect(conditions[2]).toEqual({
        item: 'Validade',
        condicao: '15 dias',
      })
      expect(conditions[3]).toEqual({
        item: 'Prazo de entrega',
        condicao: '30 dias',
      })
      expect(conditions[4].item).toBe('Garantias')
      expect(conditions[4].condicao).toContain('Painéis 25 anos · Inversor 10 anos')
    })

    it('deve preencher valores padrão elegantes quando campos da negociação forem vazios', () => {
      const conditions = buildCommercialConditionsArray({})

      expect(conditions).toHaveLength(5)
      expect(conditions[0]).toEqual({ item: 'Pagamento', condicao: 'A combinar' })
      expect(conditions[1]).toEqual({
        item: 'Financiamento',
        condicao: 'Até 84 meses (sob análise bancária)',
      })
      expect(conditions[2]).toEqual({ item: 'Validade', condicao: '15 dias' })
      expect(conditions[3]).toEqual({ item: 'Prazo de entrega', condicao: 'Até 45 dias úteis' })
      expect(conditions[4].item).toBe('Garantias')
      expect(conditions[4].condicao).toContain(
        'Painéis 25 anos · Inversor 10 anos · Instalação 5 anos',
      )
    })
  })
})
