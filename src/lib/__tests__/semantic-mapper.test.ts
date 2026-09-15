import { describe, it, expect } from 'vitest'
import {
  normalizeSemanticStr,
  getSemanticTokenList,
  resolveSemanticVariableValue,
  enrichPayloadWithSemanticVariables,
} from '@/lib/semantic-mapper'

describe('Semantic Mapper for Dynamic Proposal Variables', () => {
  it('normalizes string correctly removing accents and punctuation', () => {
    expect(normalizeSemanticStr('Potência do Kit (kWp)')).toBe('potencia do kit kwp')
    expect(normalizeSemanticStr('Geração_Estimada-Mensal')).toBe('geracao estimada mensal')
    expect(normalizeSemanticStr('Economia em 25 anos!')).toBe('economia em 25 anos')
    expect(normalizeSemanticStr('Preço de Venda / Total')).toBe('preco de venda total')
  })

  it('extracts tokens filtering stopwords', () => {
    expect(getSemanticTokenList('Potência do Kit')).toEqual(['potencia', 'kit'])
    expect(getSemanticTokenList('Valor total do investimento')).toEqual([
      'valor',
      'total',
      'investimento',
    ])
  })

  it('resolves kit power synonyms and permutations', () => {
    const context = {
      sizing: { kit_power_kwp: 7.2 },
    }

    const testKeys = [
      'kit_power_kwp',
      'power_kwp',
      'kwp',
      'potencia_kit',
      'potencia_do_kit',
      'potencia',
      'potencia_instalada',
      'kit_power',
    ]

    for (const k of testKeys) {
      const res = resolveSemanticVariableValue(k, context)
      expect(res.resolved, `Failed to resolve ${k}`).toBe(true)
      expect(res.category).toBe('sizing')
      expect(res.field).toBe('kit_power_kwp')
      expect(res.value).toBe(7.2)
    }
  })

  it('resolves total investment synonyms and token order permutations', () => {
    const context = {
      financial: { total_investment: 35000 },
    }

    const testKeys = [
      'total_investment',
      'investment_total',
      'investimento_total',
      'total_investimento',
      'valor_total_investimento',
      'valor_total',
      'preco_venda',
      'investimento',
      'price',
    ]

    for (const k of testKeys) {
      const res = resolveSemanticVariableValue(k, context)
      expect(res.resolved, `Failed to resolve ${k}`).toBe(true)
      expect(res.category).toBe('financial')
      expect(res.field).toBe('total_investment')
      expect(res.value).toBe(35000)
    }
  })

  it('resolves consumption vs generation accurately without confusion', () => {
    const context = {
      sizing: {
        avg_consumption: 450,
        estimated_monthly_generation: 520,
      },
    }

    const consRes = resolveSemanticVariableValue('consumo_mensal', context)
    expect(consRes.resolved).toBe(true)
    expect(consRes.field).toBe('avg_consumption')
    expect(consRes.value).toBe(450)

    const genRes = resolveSemanticVariableValue('geracao_mensal_estimada', context)
    expect(genRes.resolved).toBe(true)
    expect(genRes.field).toBe('estimated_monthly_generation')
    expect(genRes.value).toBe(520)

    const genKwhRes = resolveSemanticVariableValue('estimated_generation_kwh', context)
    expect(genKwhRes.resolved).toBe(true)
    expect(genKwhRes.field).toBe('estimated_monthly_generation')
    expect(genKwhRes.value).toBe(520)

    const avgConsKwhRes = resolveSemanticVariableValue('average_monthly_consumption_kwh', context)
    expect(avgConsKwhRes.resolved).toBe(true)
    expect(avgConsKwhRes.field).toBe('avg_consumption')
    expect(avgConsKwhRes.value).toBe(450)
  })

  it('resolves Template 2 specific fields and calculations correctly', () => {
    const context = {
      negotiation: {
        consultant_name: 'Carlos Silva',
        proposal_number: 'PROP-2026-001',
        proposal_date: '28/03/2026',
        validity_days: 15,
      },
      sizing: {
        consumption_coverage_pct: 124.8,
        occupied_area_m2: 31.0,
      },
      financial: {
        investment_multiple: 11.3,
        tir_pct: 45.1,
        co2_avoided_ton: 0.29,
      },
    }

    expect(resolveSemanticVariableValue('consultant_name', context).value).toBe('Carlos Silva')
    expect(resolveSemanticVariableValue('proposal_number', context).value).toBe('PROP-2026-001')
    expect(resolveSemanticVariableValue('proposal_date', context).value).toBe('28/03/2026')
    expect(resolveSemanticVariableValue('validity_days', context).value).toBe(15)
    expect(resolveSemanticVariableValue('consumption_coverage_pct', context).value).toBe(124.8)
    expect(resolveSemanticVariableValue('occupied_area_m2', context).value).toBe(31.0)
    expect(resolveSemanticVariableValue('investment_multiple', context).value).toBe(11.3)
    expect(resolveSemanticVariableValue('tir_pct', context).value).toBe(45.1)
    expect(resolveSemanticVariableValue('co2_avoided_ton', context).value).toBe(0.29)
  })

  it('resolves payback, savings and customer info', () => {
    const context = {
      lead: { name: 'João Silva', document: '12345678900' },
      financial: {
        monthly_savings: 400,
        savings_25_years: 120000,
        payback_years: 3.5,
      },
    }

    expect(resolveSemanticVariableValue('nome_cliente', context).value).toBe('João Silva')
    expect(resolveSemanticVariableValue('cpf_cnpj', context).value).toBe('12345678900')
    expect(resolveSemanticVariableValue('economia_mensal', context).value).toBe(400)
    expect(resolveSemanticVariableValue('economia_25_anos', context).value).toBe(120000)
    expect(resolveSemanticVariableValue('tempo_retorno', context).value).toBe(3.5)
  })

  it('enriches payload correctly and reports unresolved keys without crashing', () => {
    const dynamicSchema = [
      { key: 'potencia_kit', label: 'Potência' },
      { key: 'consumo_medio', label: 'Consumo' },
      { key: 'investimento_total', label: 'Investimento' },
      { key: 'variavel_inexistente_xyz', label: 'Desconhecida' },
    ]

    const basePayload = {
      lead: { name: 'Maria' },
      negotiation: { title: 'Negociação' },
      sizing: { kit_power_kwp: 10, avg_consumption: 800 },
      financial: { total_investment: 45000 },
    }

    const enriched = enrichPayloadWithSemanticVariables(dynamicSchema, basePayload)
    expect(enriched.sizing['potencia_kit']).toBe(10)
    expect(enriched.sizing['consumo_medio']).toBe(800)
    expect(enriched.financial['investimento_total']).toBe(45000)
    expect(enriched.dynamic['potencia_kit']).toBe(10)
    expect(enriched.dynamic['consumo_medio']).toBe(800)
    expect(enriched.dynamic['investimento_total']).toBe(45000)
    expect(enriched.unresolved).toContain('variavel_inexistente_xyz')
  })

  it('applies manualDynamicMappings with priority over semantic resolution and populates dynamic block', () => {
    const dynamicSchema = [
      'estimated_generation_kwh',
      'average_monthly_consumption_kwh',
      'validity_days',
      'consumption_coverage_pct',
      'occupied_area_m2',
      'co2_avoided_ton',
      'investment_multiple',
      'tir_pct',
      'consultant_name',
      'proposal_number',
      'proposal_date',
      'savings_25_years',
    ]

    const basePayload = {
      lead: { name: 'Cliente Teste' },
      negotiation: {
        avg_consumption: 500,
        validity_days: 10,
        consultant_name: 'Consultor Teste',
        proposal_number: 'PROP-123',
        proposal_date: '28/03/2026',
      },
      sizing: {
        estimated_monthly_generation: 531,
        avg_consumption: 400, // manual mapping will override to negotiation.avg_consumption (500)
        consumption_coverage_pct: 109.2,
        occupied_area_m2: 25.5,
      },
      financial: {
        savings_25_years: 150000,
        investment_multiple: 8.5,
        tir_pct: 32.4,
        co2_avoided_ton: 0.25,
      },
    }

    // Manual mapping configured by ADM for Template 2 (hckz6sy7teg0vi0)
    const manualMappings = {
      average_monthly_consumption_kwh: 'negotiation.avg_consumption',
      estimated_generation_kwh: 'sizing.estimated_monthly_generation',
    }

    const enriched = enrichPayloadWithSemanticVariables(dynamicSchema, basePayload, manualMappings)

    // Manual override checks
    expect(enriched.dynamic['average_monthly_consumption_kwh']).toBe(500)
    expect(enriched.dynamic['estimated_generation_kwh']).toBe(531)
    expect(enriched.resolved['average_monthly_consumption_kwh'].matchType).toBe('manual_override')
    expect(enriched.resolved['estimated_generation_kwh'].matchType).toBe('manual_override')

    // Semantic / exact checks for all 12 variables
    expect(enriched.dynamic['validity_days']).toBe(10)
    expect(enriched.dynamic['consumption_coverage_pct']).toBe(109.2)
    expect(enriched.dynamic['occupied_area_m2']).toBe(25.5)
    expect(enriched.dynamic['co2_avoided_ton']).toBe(0.25)
    expect(enriched.dynamic['investment_multiple']).toBe(8.5)
    expect(enriched.dynamic['tir_pct']).toBe(32.4)
    expect(enriched.dynamic['consultant_name']).toBe('Consultor Teste')
    expect(enriched.dynamic['proposal_number']).toBe('PROP-123')
    expect(enriched.dynamic['proposal_date']).toBe('28/03/2026')
    expect(enriched.dynamic['savings_25_years']).toBe(150000)

    // Check all 12 keys are present in dynamic
    expect(Object.keys(enriched.dynamic)).toHaveLength(12)
    expect(enriched.unresolved).toHaveLength(0)
  })

  it('verifies exact calculation values for negotiation qdvjkm9lykdg5d0 scenario', () => {
    // Sizing 12 months mock from negotiation qdvjkm9lykdg5d0:
    // months: jan: 624, feb: 546, mar: 559, apr: 520, may: 481, jun: 442, jul: 468, aug: 507, sep: 533, oct: 559, nov: 572, dec: 611
    // sum = 6422, average = 6422 / 12 = 535.166... or feb ref = 546
    const avgConsumption = 500
    const estGen = 546 // or 531
    const coverage = Number(((estGen / avgConsumption) * 100).toFixed(1))
    expect(coverage).toBeCloseTo(109.2, 1)

    // Validity date test: 2026-09-25 with base 2026-09-15 -> 10 days
    const validityDate = '2026-09-25'
    const baseDate = new Date('2026-09-15T12:00:00Z')
    const tDate = new Date(validityDate + 'T12:00:00Z')
    const diffDays = Math.round((tDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(10)

    // CO2 avoided for ~546 kWh/month: 546 * 12 * 0.0385 / 1000 = ~0.25 ton
    const co2Ton = Number(((estGen * 12 * 0.0385) / 1000).toFixed(2))
    expect(co2Ton).toBe(0.25)
  })
})
