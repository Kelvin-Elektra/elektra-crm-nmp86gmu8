import { describe, it, expect } from 'vitest'
import {
  formatValueForContract,
  extractPlaceholdersFromTemplate,
  resolveSinglePlaceholder,
  resolveContractPlaceholders,
  buildContractContextFromNegotiation,
  ContractContextData,
} from '../contract-resolver'

describe('contract-resolver', () => {
  const sampleContext: ContractContextData = {
    lead: {
      name: 'João da Silva Sauro',
      document: '123.456.789-00',
      phone: '(11) 98765-4321',
      email: 'joao.silva@exemplo.com.br',
      address: 'Rua das Palmeiras, 100',
      city: 'Campinas',
      state: 'SP',
      cep: '13083-000',
      neighborhood: 'Jardim Primavera',
      number: '100',
    },
    negotiation: {
      id: 'neg_123456',
      title: 'Projeto Solar Residencial 5.5 kWp',
      consultant_name: 'Carlos Consultor',
      proposal_number: 'PROP-2025-01',
      proposal_date: '23/02/2025',
      validity_days: 15,
      defined_payment_method: 'Financiamento Bancário (Santander)',
      payment_terms: 'Entrada de 20% + 48x de R$ 450,00',
      installation_lead_time: '45 dias úteis',
      uc: '987654321',
    },
    sizing: {
      kit_power_kwp: 5.5,
      avg_consumption: 650,
      estimated_monthly_generation: 720,
      module_qty: 10,
      concessionaire: 'CPFL Paulista',
      roof_type: 'Metálico',
      network_type: 'Bifásico',
      address_struct: {
        city: 'Campinas',
        state: 'SP',
        street: 'Rua das Palmeiras',
        number: '100',
        zip: '13083-000',
      },
    },
    financial: {
      total_investment: 22500,
      monthly_savings: 610.5,
      annual_savings: 7326,
      savings_25_years: 183150,
      investment_multiple: 8.14,
      tir_pct: 32.5,
      payback_years: 3.1,
    },
    company: {
      name: 'Elektra Energia Solar Ltda',
      cnpj: '12.345.678/0001-99',
      phone: '(19) 3322-1100',
      email: 'contato@elektrasolar.com.br',
    },
  }

  describe('formatValueForContract', () => {
    it('formata valores monetários em padrão BRL', () => {
      const formatted = formatValueForContract('valor_total', 22500)
      expect(formatted).toContain('22.500')
      expect(formatted).toMatch(/R\$/)
    })

    it('formata potência e consumo com unidades corretas', () => {
      expect(formatValueForContract('potencia_kit', 5.5)).toBe('5,5 kWp')
      expect(formatValueForContract('consumo_medio', 650)).toBe('650 kWh')
    })

    it('formata percentuais e múltiplos', () => {
      expect(formatValueForContract('tir_pct', 32.5)).toBe('32,5%')
      expect(formatValueForContract('multiplo_investimento', 8.14)).toBe('8,14x')
      expect(formatValueForContract('cobertura_consumo', 110.8)).toBe('110,8%')
    })

    it('formata datas ISO para DD/MM/AAAA', () => {
      expect(formatValueForContract('data_emissao', '2025-05-18T10:00:00Z')).toBe('18/05/2025')
    })
  })

  describe('extractPlaceholdersFromTemplate', () => {
    it('extrai tags no padrão {{tag}} unificando duplicadas', () => {
      const template =
        'Olá {{cliente_nome}}, seu contrato no valor de {{valor_total}}. Lembra, {{cliente_nome}}?'
      const tags = extractPlaceholdersFromTemplate(template)
      expect(tags).toEqual(['cliente_nome', 'valor_total'])
    })

    it('retorna array vazio para template sem tags', () => {
      expect(extractPlaceholdersFromTemplate('Contrato simples sem tags.')).toEqual([])
    })
  })

  describe('resolveSinglePlaceholder', () => {
    it('resolve aliases diretos em português (cliente_nome, valor_total, etc.)', () => {
      const resNome = resolveSinglePlaceholder('cliente_nome', sampleContext)
      expect(resNome.resolved).toBe(true)
      expect(resNome.value).toBe('João da Silva Sauro')

      const resValor = resolveSinglePlaceholder('valor_total', sampleContext)
      expect(resValor.resolved).toBe(true)
      expect(resValor.value).toBe(22500)

      const resEmpresa = resolveSinglePlaceholder('empresa_cnpj', sampleContext)
      expect(resEmpresa.resolved).toBe(true)
      expect(resEmpresa.value).toBe('12.345.678/0001-99')

      const resTelhado = resolveSinglePlaceholder('tipo_telhado', sampleContext)
      expect(resTelhado.resolved).toBe(true)
      expect(resTelhado.value).toBe('Metálico')
    })

    it('resolve aliases do Checklist Técnico (tensao, observacoes, cobertura, painel, inversor)', () => {
      const contextWithChecklist: ContractContextData = {
        ...sampleContext,
        negotiation: {
          ...sampleContext.negotiation,
          notes: 'Cliente solicitou inversor na área de serviço.',
        },
        sizing: {
          ...sampleContext.sizing,
          tension: '220V',
          module_model: 'Canadian Solar 550W',
          inverter_model: 'Growatt 5kW',
          consumption_coverage_pct: 110.8,
        },
      }

      expect(resolveSinglePlaceholder('tensao_rede', contextWithChecklist).value).toBe('220V')
      expect(resolveSinglePlaceholder('observacoes', contextWithChecklist).value).toBe(
        'Cliente solicitou inversor na área de serviço.',
      )
      expect(resolveSinglePlaceholder('modelo_painel', contextWithChecklist).value).toBe(
        'Canadian Solar 550W',
      )
      expect(resolveSinglePlaceholder('modelo_inversor', contextWithChecklist).value).toBe(
        'Growatt 5kW',
      )
      expect(resolveSinglePlaceholder('cobertura_consumo', contextWithChecklist).value).toBe(110.8)
    })

    it('resolve dot-notation explícita', () => {
      const res = resolveSinglePlaceholder('lead.email', sampleContext)
      expect(res.resolved).toBe(true)
      expect(res.value).toBe('joao.silva@exemplo.com.br')
    })

    it('resolve via sinônimos semânticos do CRM', () => {
      const resPower = resolveSinglePlaceholder('tamanho_sistema', sampleContext)
      expect(resPower.resolved).toBe(true)
      expect(resPower.value).toBe(5.5)

      const resPayback = resolveSinglePlaceholder('tempo_retorno', sampleContext)
      expect(resPayback.resolved).toBe(true)
      expect(resPayback.value).toBe(3.1)
    })

    it('marca placeholder inexistente como não resolvido', () => {
      const res = resolveSinglePlaceholder('campo_inexistente_xyz_123', sampleContext)
      expect(res.resolved).toBe(false)
      expect(res.value).toBeUndefined()
    })
  })

  describe('resolveContractPlaceholders', () => {
    it('preenche template substituindo tags e alertando tags não resolvidas', () => {
      const template = `
# CONTRATO
CONTRATANTE: {{cliente_nome}}, CPF {{cliente_documento}}
CONTRATADA: {{empresa_nome}}
VALOR: {{valor_total}}
POTÊNCIA: {{potencia_kit}}
TESTE QUEBRADO: {{placeholder_fantasma}}
      `.trim()

      const output = resolveContractPlaceholders(template, sampleContext)

      expect(output.unresolvedCount).toBe(1)
      expect(output.unresolvedKeys).toContain('placeholder_fantasma')
      expect(output.resolvedContent).toContain('João da Silva Sauro')
      expect(output.resolvedContent).toContain('123.456.789-00')
      expect(output.resolvedContent).toContain('Elektra Energia Solar Ltda')
      expect(output.resolvedContent).toContain('5,5 kWp')
      // Placeholder quebrado permanece visível no texto resolvido e destacado no preview HTML
      expect(output.resolvedContent).toContain('{{placeholder_fantasma}}')
      expect(output.htmlPreview).toContain('⚠️ {{placeholder_fantasma}}')
    })
  })

  describe('buildContractContextFromNegotiation', () => {
    it('constrói contexto consistente a partir da negociação expandida', () => {
      const mockNeg = {
        id: 'neg_abc',
        title: 'Usina Solar Silva',
        amount: 35000,
        expand: {
          lead_id: {
            name: 'Maria Souza',
            cpf: '999.888.777-66',
            phone: '11999998888',
          },
          owner_id: {
            name: 'Roberto Vendedor',
          },
        },
        sizing: {
          kit_power_kwp: 8.2,
          concessionaire: 'Enel SP',
        },
      }

      const ctx = buildContractContextFromNegotiation(mockNeg, [], {
        name: 'Sol Forte Engenharia',
        cnpj: '00.111.222/0001-33',
      })

      expect(ctx.lead?.name).toBe('Maria Souza')
      expect(ctx.lead?.document).toBe('999.888.777-66')
      expect(ctx.negotiation?.consultant_name).toBe('Roberto Vendedor')
      expect(ctx.sizing?.kit_power_kwp).toBe(8.2)
      expect(ctx.company?.name).toBe('Sol Forte Engenharia')
      expect(ctx.financial?.total_investment).toBe(35000)
    })

    it('resolve todos os campos dos modelos reais (Contrato, Procuração, Checklist)', () => {
      // Mock realista baseado no caso 'kelvao amigao' da base de dados
      const realNeg = {
        id: 'aocqnjavc1z2bqt',
        title: 'kelvin 3',
        address: 'Travessa Primeiro de Maio, 55 - Industrial, Francisco Beltrão - PR, 85601-330',
        number: '55',
        neighborhood: 'Industrial',
        city: 'Francisco Beltrão',
        state: 'PR',
        cep: '85601-330',
        concessionaire: 'Copel',
        consumer_category: 'Residencial',
        avg_consumption: 1200,
        uc: '212454',
        expand: {
          lead_id: {
            id: 't2i9r8n2ck1y39l',
            name: 'kelvao amigao',
            document: '460.353.828-60',
            phone: '(46) 99902-9158',
            email: 'lead@kelvin.com',
          },
          owner_id: {
            name: 'Consultor Carlos',
          },
        },
        sizing: {
          kit_power_kwp: 10.5,
          avg_consumption: 1200,
          estimated_monthly_generation: 1217,
          consumption_coverage_pct: 101.4,
          module_qty: 15,
          roof_type: 'Fibrocimento',
          network_type: 'Bifásico',
          tension: '220V',
          consumer_category: 'Residencial',
          address_struct: {
            street: 'Travessa Primeiro de Maio',
            number: '55',
            neighborhood: 'Industrial',
            city: 'Francisco Beltrão',
            state: 'PR',
            zip: '85601-330',
          },
        },
      }

      const realProposals = [
        {
          id: '7gppdev36iivf12',
          proposal_code: '#0024',
          total_value: 8823.64,
          created: '2026-09-15T17:45:06.976Z',
          kit_details: {
            sizing: {
              kit_power_kwp: 10.5,
              avg_consumption: 1200,
              estimated_monthly_generation: 1217,
              module_qty: 15,
              module_model: 'Dah Solar 550W Tier 1',
              inverter_model: 'Deye 10kW Híbrido',
            },
          },
          snapshot_data: {
            pricing_data: {
              rawModule: { brand: 'Dah Solar', name: 'DHN-72X16', power: 550 },
              rawInverters: [{ brand: 'Deye', name: 'SUN-10K-G', power: 10 }],
            },
          },
        },
      ]

      const ctx = buildContractContextFromNegotiation(realNeg, realProposals, {
        name: 'BrilhaSol Engenharia',
        cnpj: '00.000.000/0001-12',
        phone: '(46) 3524-0000',
        email: 'contato@brilhasol.com.br',
      })

      // Testar resolução dos campos do Contrato Padrão
      const contratoTemplate = `
      {{empresa_nome}} {{empresa_cnpj}} {{empresa_telefone}} {{empresa_email}}
      {{cliente_nome}} {{cliente_documento}} {{cliente_endereco}} {{cliente_numero}} {{cliente_bairro}} {{cliente_cep}} {{cliente_cidade}} {{cliente_uf}} {{cliente_telefone}} {{cliente_email}}
      {{concessionaria}} {{potencia_kit}} {{consumo_medio}} {{geracao_estimada}}
      {{endereco_instalacao}} {{cidade_instalacao}} {{uf_instalacao}} {{tipo_telhado}}
      {{valor_total}} {{forma_pagamento}} {{condicoes_pagamento}} {{prazo_instalacao}} {{validade_dias}} {{codigo_proposta}} {{data_proposta}}
      `
      const resContrato = resolveContractPlaceholders(contratoTemplate, ctx)
      expect(resContrato.unresolvedCount).toBe(0)
      expect(resContrato.resolvedContent).toContain('kelvao amigao')
      expect(resContrato.resolvedContent).toContain('460.353.828-60')
      expect(resContrato.resolvedContent).toContain('10,5 kWp')
      expect(resContrato.resolvedContent).toContain('1.200 kWh')
      expect(resContrato.resolvedContent).toContain('1.217 kWh')

      // Testar resolução dos campos da Procuração
      const procuracaoTemplate = `
      {{cliente_nome}} {{cliente_documento}} {{cliente_telefone}} {{cliente_email}}
      {{cliente_endereco}} {{cliente_numero}} {{cliente_bairro}} {{cliente_cep}} {{cliente_cidade}} {{cliente_uf}}
      {{empresa_nome}} {{empresa_cnpj}} {{empresa_telefone}} {{empresa_email}}
      {{consultor_nome}} {{concessionaria}} {{potencia_kit}} {{unidade_consumidora}}
      {{endereco_instalacao}} {{cidade_instalacao}} {{uf_instalacao}} {{data_proposta}}
      `
      const resProcuracao = resolveContractPlaceholders(procuracaoTemplate, ctx)
      expect(resProcuracao.unresolvedCount).toBe(0)
      expect(resProcuracao.resolvedContent).toContain('212454')
      expect(resProcuracao.resolvedContent).toContain('Copel')

      // Testar resolução dos campos do Checklist Técnico
      const checklistTemplate = `
      {{empresa_nome}} {{empresa_cnpj}} {{empresa_telefone}} {{empresa_email}} {{consultor_nome}} {{data_proposta}} {{codigo_proposta}}
      {{cliente_nome}} {{cliente_documento}} {{cliente_telefone}} {{cliente_email}}
      {{cliente_endereco}} {{cliente_numero}} {{cliente_bairro}} {{cliente_cep}} {{cliente_cidade}} {{cliente_uf}}
      {{unidade_consumidora}} {{concessionaria}} {{endereco_instalacao}} {{cidade_instalacao}} {{uf_instalacao}}
      {{tipo_rede}} {{tensao_rede}} {{categoria_consumo}} {{potencia_kit}} {{consumo_medio}} {{geracao_estimada}} {{cobertura_consumo}}
      {{qtd_modulos}} {{modelo_painel}} {{modelo_inversor}} {{area_ocupada}} {{tipo_telhado}} {{observacoes}}
      `
      const resChecklist = resolveContractPlaceholders(checklistTemplate, ctx)
      expect(resChecklist.unresolvedCount).toBe(0)
      expect(resChecklist.resolvedContent).toContain('15')
      expect(resChecklist.resolvedContent).toContain('Fibrocimento')
      expect(resChecklist.resolvedContent).toContain('220V')
      expect(resChecklist.resolvedContent).toContain('Residencial')
    })

    it('não exibe spans ou tags HTML brutas no preview', () => {
      const template = 'O cliente {{cliente_nome}} contratou o sistema de {{potencia_kit}}.'
      const res = resolveContractPlaceholders(template, sampleContext)

      // htmlPreview deve conter tags HTML válidas de span e não entidades escapadas tipo &lt;span
      expect(res.htmlPreview).toContain('<span class="bg-emerald-50')
      expect(res.htmlPreview).not.toContain('&lt;span')
      expect(res.htmlPreview).not.toContain('&lt;/span&gt;')
    })
  })
})
