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
    expect(enriched.unresolved).toContain('variavel_inexistente_xyz')
  })
})
