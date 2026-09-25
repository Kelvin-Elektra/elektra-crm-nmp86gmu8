import { resolveSemanticVariableValue } from './semantic-mapper'
import { getValueByDotNotation } from './dynamic-mapping'

export interface ContractContextData {
  lead?: Record<string, any>
  negotiation?: Record<string, any>
  sizing?: Record<string, any>
  financial?: Record<string, any>
  company?: Record<string, any>
  address_struct?: Record<string, any>
  tariff_details?: Record<string, any>
  [key: string]: any
}

export interface PlaceholderResolutionResult {
  originalTag: string
  key: string
  resolved: boolean
  value: string
  formattedValue: string
  matchType?: string
  field?: string
  category?: string
}

export interface ContractResolveOutput {
  resolvedContent: string
  htmlPreview: string
  placeholders: PlaceholderResolutionResult[]
  unresolvedCount: number
  totalCount: number
  unresolvedKeys: string[]
}

/**
 * Formata valores monetários, datas e números em padrão PT-BR
 */
export function formatValueForContract(key: string, value: any): string {
  if (value === undefined || value === null || value === '') {
    return ''
  }

  // Se já for string formatada em R$ ou data formatada, manter
  if (typeof value === 'string') {
    const trimmed = value.trim()
    // Se for data ISO (ex: 2025-02-23T...)
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      try {
        const d = new Date(trimmed)
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('pt-BR')
        }
      } catch {
        /* intentionally ignored */
      }
    }
    return trimmed
  }

  // Se for número
  if (typeof value === 'number') {
    const k = key.toLowerCase()
    // Campos que representam dinheiro
    if (
      k.includes('valor') ||
      k.includes('preco') ||
      k.includes('investimento') ||
      k.includes('economia') ||
      k.includes('custo') ||
      k.includes('subtotal') ||
      k.includes('desconto') ||
      k.includes('total_investment') ||
      k.includes('monthly_savings') ||
      k.includes('annual_savings') ||
      k.includes('savings')
    ) {
      return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      })
    }

    // Campos de potência kWp ou kWh
    if (k.includes('kwp') || k.includes('potencia')) {
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} kWp`
    }
    if (k.includes('kwh') || k.includes('consumo') || k.includes('geracao')) {
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kWh`
    }

    // Percentual
    if (
      k.includes('pct') ||
      k.includes('porcentagem') ||
      k.includes('taxa') ||
      k.includes('tir') ||
      k.includes('cobertura')
    ) {
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`
    }

    // Múltiplo
    if (k.includes('multiple') || k.includes('multiplo')) {
      return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}x`
    }

    // Número genérico
    return value.toLocaleString('pt-BR')
  }

  // Se for array ou objeto, serializar amigavelmente
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(', ')
  }

  return String(value)
}

/**
 * Constrói payload de dados unificado da negociação a partir do objeto da negociação
 * compatível com o formato esperado pelo mapeador semântico e catálogo do CRM.
 */
export function buildContractContextFromNegotiation(
  neg: any,
  proposals: any[] = [],
  companyRecord?: any,
): ContractContextData {
  if (!neg) return {}

  const lead = neg.expand?.lead_id || neg.lead_id || {}
  const owner = neg.expand?.owner_id || neg.owner_id || {}
  const comp = companyRecord || neg.expand?.company_id || {}
  const activeProposal =
    proposals.find((p) => p.is_active || p.status === 'aprovada' || p.status === 'ganho') ||
    proposals[0] ||
    {}

  const sizing = neg.sizing || {}
  const financial = activeProposal.snapshot_data?.financial || activeProposal || {}
  const snapshotData = activeProposal.snapshot_data || {}
  const pricingData = snapshotData.pricing_data || {}

  // Extração inteligente de modelo de módulo e inversor dos dados gravados ou snapshot
  let moduleModelName = ''
  if (pricingData.rawModule) {
    const brand = pricingData.rawModule.brand ? String(pricingData.rawModule.brand).trim() : ''
    const name = pricingData.rawModule.name ? String(pricingData.rawModule.name).trim() : ''
    const pwr = pricingData.rawModule.power ? `${pricingData.rawModule.power}W` : ''
    moduleModelName = [brand, name, pwr].filter(Boolean).join(' ')
  } else if (snapshotData.equipment?.modules) {
    const mod = snapshotData.equipment.modules
    moduleModelName = [mod.brand, mod.name, mod.power ? `${mod.power}W` : '']
      .filter(Boolean)
      .join(' ')
  } else if (sizing.module_name || sizing.module_model) {
    moduleModelName = sizing.module_name || sizing.module_model
  }

  let inverterModelName = ''
  const invertersList =
    pricingData.rawInverters || snapshotData.equipment?.inverters || sizing.inverters || []
  if (Array.isArray(invertersList) && invertersList.length > 0) {
    const firstInv = invertersList[0]
    const brand = firstInv.brand ? String(firstInv.brand).trim() : ''
    const name = firstInv.name ? String(firstInv.name).trim() : ''
    const pwr = firstInv.power ? `${firstInv.power} kW` : ''
    const count = invertersList.length > 1 ? ` (${invertersList.length}x)` : ''
    inverterModelName = [brand, name, pwr].filter(Boolean).join(' ') + count
  } else if (sizing.inverter_name || sizing.inverter_model) {
    inverterModelName = sizing.inverter_name || sizing.inverter_model
  }

  const resolvedTension =
    sizing.tension ||
    sizing.voltage ||
    sizing.network_voltage ||
    financial.tariff_details?.voltage ||
    '220V'

  const resolvedInstallationType =
    sizing.installation_type || sizing.installation_id || sizing.consumer_category || 'Residencial'

  const leadData: Record<string, any> = {
    name: lead.name || neg.lead_name || '',
    document: lead.document || lead.cpf || lead.cnpj || '',
    phone: lead.phone || '',
    email: lead.email || '',
    address: lead.address || '',
    city: lead.city || '',
    state: lead.state || lead.uf || '',
    cep: lead.cep || lead.zip || '',
    neighborhood: lead.neighborhood || lead.bairro || '',
    number: lead.number || lead.numero || '',
  }

  const proposalCodeDisplay =
    activeProposal.proposal_code ||
    (activeProposal.proposal_seq != null
      ? `#${String(activeProposal.proposal_seq).padStart(4, '0')}`
      : activeProposal.id
        ? activeProposal.id.slice(0, 8).toUpperCase()
        : neg.id.slice(0, 8).toUpperCase())

  const negotiationData: Record<string, any> = {
    id: neg.id,
    title: neg.title || '',
    consultant_name: owner.name || neg.consultant_name || '',
    proposal_number: proposalCodeDisplay,
    proposal_date: activeProposal.created
      ? new Date(activeProposal.created).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR'),
    validity_days: activeProposal.validity_days || 15,
    validity: activeProposal.validity || '15 dias',
    payment_terms: activeProposal.payment_terms || 'À vista ou Financiamento Bancário',
    defined_payment_method: activeProposal.defined_payment_method || 'Financiamento',
    accepted_payment_methods: 'À vista, Financiamento Bancário, Cartão de Crédito',
    installation_lead_time: neg.installation_lead_time || '45 a 60 dias úteis',
    notes: neg.notes || '',
    description: neg.description || activeProposal.description || '',
    uc: neg.uc || lead.uc || '',
  }

  const rawKwp =
    sizing.kit_power_kwp || activeProposal.power || activeProposal.kwp || neg.total_power_kwp || 0

  const rawConsumption =
    sizing.avg_consumption || neg.avg_consumption || activeProposal.consumption || 0

  const rawGeneration =
    sizing.estimated_monthly_generation || activeProposal.estimated_monthly_generation || 0

  const rawCoverage =
    sizing.consumption_coverage_pct ||
    (rawConsumption > 0 ? Number(((rawGeneration / rawConsumption) * 100).toFixed(1)) : 100)

  const sizingData: Record<string, any> = {
    kit_power_kwp: rawKwp,
    avg_consumption: rawConsumption,
    estimated_monthly_generation: rawGeneration,
    consumption_coverage_pct: rawCoverage,
    occupied_area_m2: sizing.occupied_area_m2 || 0,
    module_qty: sizing.module_qty || activeProposal.module_qty || 0,
    consumer_category: sizing.consumer_category || 'Residencial',
    concessionaire: sizing.concessionaire || neg.concessionaire || 'Concessionária Local',
    roof_type: sizing.roof_type || 'Fibrocimento',
    network_type: sizing.network_type || 'Bifásico',
    tension: resolvedTension,
    installation_type: resolvedInstallationType,
    module_model: moduleModelName || 'Módulo Solar Fotovoltaico Homologado',
    inverter_model: inverterModelName || 'Inversor Solar Homologado',
    simultaneity_factor: sizing.simultaneity_factor || 30,
    address_struct: {
      city: sizing.address_struct?.city || lead.city || '',
      state: sizing.address_struct?.state || lead.state || lead.uf || '',
      street: sizing.address_struct?.street || lead.address || '',
      number: sizing.address_struct?.number || lead.number || '',
      zip: sizing.address_struct?.zip || lead.cep || '',
    },
  }

  const financialData: Record<string, any> = {
    total_investment:
      activeProposal.total_value ||
      activeProposal.price ||
      neg.amount ||
      neg.total_value ||
      financial.total_investment ||
      0,
    monthly_savings: financial.monthly_savings || 0,
    annual_savings: financial.annual_savings || 0,
    savings_25_years: financial.savings_25_years || 0,
    investment_multiple: financial.investment_multiple || 0,
    tir_pct: financial.tir_pct || 0,
    co2_avoided_ton: financial.co2_avoided_ton || 0,
    payback_years: financial.payback_years || 0,
    payback_months: financial.payback_months || 0,
    tariff_rate: financial.tariff_rate || 0.95,
    subtotal: activeProposal.total_value || neg.amount || 0,
    discount_amount: activeProposal.discount_amount || 0,
  }

  const companyData: Record<string, any> = {
    name: comp.name || 'Elektra Solar',
    cnpj: comp.cnpj || '',
    phone: comp.phone || '',
    email: comp.email || '',
    logo: comp.logo || '',
  }

  return {
    lead: leadData,
    negotiation: negotiationData,
    sizing: sizingData,
    financial: financialData,
    company: companyData,
    address_struct: sizingData.address_struct,
  }
}

/**
 * Mapeamentos diretos conhecidos em Português para variáveis frequentes de contrato
 */
const DIRECT_CONTRACT_ALIASES: Record<string, string> = {
  // Cliente / Contratante
  cliente_nome: 'lead.name',
  nome_cliente: 'lead.name',
  cliente_documento: 'lead.document',
  cpf_cnpj: 'lead.document',
  cpf_cliente: 'lead.document',
  cliente_telefone: 'lead.phone',
  telefone_cliente: 'lead.phone',
  cliente_email: 'lead.email',
  email_cliente: 'lead.email',
  cliente_endereco: 'lead.address',
  endereco_cliente: 'lead.address',
  cliente_cidade: 'lead.city',
  cidade_cliente: 'lead.cidade',
  cliente_uf: 'lead.state',
  cliente_estado: 'lead.state',
  cliente_cep: 'lead.cep',
  cliente_bairro: 'lead.neighborhood',
  cliente_numero: 'lead.number',

  // Empresa / Contratada
  empresa_nome: 'company.name',
  nome_empresa: 'company.name',
  empresa_cnpj: 'company.cnpj',
  cnpj_empresa: 'company.cnpj',
  empresa_telefone: 'company.phone',
  empresa_email: 'company.email',

  // Negociação / Proposta
  titulo_negociacao: 'negotiation.title',
  consultor_nome: 'negotiation.consultant_name',
  vendedor: 'negotiation.consultant_name',
  codigo_proposta: 'negotiation.proposal_number',
  numero_proposta: 'negotiation.proposal_number',
  data_proposta: 'negotiation.proposal_date',
  validade_dias: 'negotiation.validity_days',
  forma_pagamento: 'negotiation.defined_payment_method',
  condicoes_pagamento: 'negotiation.payment_terms',
  prazo_instalacao: 'negotiation.installation_lead_time',
  unidade_consumidora: 'negotiation.uc',
  uc: 'negotiation.uc',

  // Negociação / Observações
  observacoes: 'negotiation.notes',
  observacao: 'negotiation.notes',
  notas: 'negotiation.notes',

  // Dimensionamento / Usina / Checklist Técnico
  potencia_kit: 'sizing.kit_power_kwp',
  potencia_sistema: 'sizing.kit_power_kwp',
  kwp: 'sizing.kit_power_kwp',
  consumo_medio: 'sizing.avg_consumption',
  consumo_mensal: 'sizing.avg_consumption',
  geracao_estimada: 'sizing.estimated_monthly_generation',
  geracao_mensal: 'sizing.estimated_monthly_generation',
  cobertura_consumo: 'sizing.consumption_coverage_pct',
  cobertura: 'sizing.consumption_coverage_pct',
  quantidade_modulos: 'sizing.module_qty',
  qtd_modulos: 'sizing.module_qty',
  modelo_painel: 'sizing.module_model',
  modelo_modulo: 'sizing.module_model',
  modulo_modelo: 'sizing.module_model',
  painel: 'sizing.module_model',
  modelo_inversor: 'sizing.inverter_model',
  inversor_modelo: 'sizing.inverter_model',
  inversor: 'sizing.inverter_model',
  area_ocupada: 'sizing.occupied_area_m2',
  concessionaria: 'sizing.concessionaire',
  tipo_telhado: 'sizing.roof_type',
  estrutura_telhado: 'sizing.roof_type',
  tipo_estrutura: 'sizing.roof_type',
  tipo_rede: 'sizing.network_type',
  tensao_rede: 'sizing.tension',
  tensao: 'sizing.tension',
  tipo_instalacao: 'sizing.installation_type',
  categoria_consumo: 'sizing.consumer_category',
  endereco_instalacao: 'sizing.address_struct.street',
  cidade_instalacao: 'sizing.address_struct.city',
  uf_instalacao: 'sizing.address_struct.state',

  // Financeiro
  valor_total: 'financial.total_investment',
  investimento_total: 'financial.total_investment',
  preco_total: 'financial.total_investment',
  preco: 'financial.total_investment',
  economia_mensal: 'financial.monthly_savings',
  economia_anual: 'financial.annual_savings',
  economia_25_anos: 'financial.savings_25_years',
  payback_anos: 'financial.payback_years',
  tir: 'financial.tir_pct',
}

/**
 * Extrai todos os placeholders no formato {{chave}} ou {chave} do texto
 */
export function extractPlaceholdersFromTemplate(text: string): string[] {
  if (!text) return []
  const matches = text.match(/\{\{([^{}]+)\}\}/g) || []
  const uniqueKeys = new Set<string>()

  for (const m of matches) {
    const rawKey = m.replace(/^\{\{/, '').replace(/\}\}$/, '').trim()
    if (rawKey) {
      uniqueKeys.add(rawKey)
    }
  }

  return Array.from(uniqueKeys)
}

/**
 * Resolve um placeholder único contra o contexto da negociação
 */
export function resolveSinglePlaceholder(
  key: string,
  context: ContractContextData,
): { resolved: boolean; value: any; matchType?: string; field?: string; category?: string } {
  const cleanKey = key.trim()
  const lowerKey = cleanKey.toLowerCase().replace(/[-]/g, '_')

  // 1. Verificar alias direto (ex: cliente_nome, valor_total, etc.)
  const directPath = DIRECT_CONTRACT_ALIASES[lowerKey]
  if (directPath) {
    const val = getValueByDotNotation(context, directPath)
    if (val !== undefined && val !== null && val !== '') {
      const [category, ...rest] = directPath.split('.')
      return {
        resolved: true,
        value: val,
        matchType: 'direct_alias',
        category,
        field: rest.join('.'),
      }
    }
  }

  // 2. Tentar dot-notation direta se a chave for ex: lead.name ou financial.total_investment
  if (cleanKey.includes('.')) {
    const val = getValueByDotNotation(context, cleanKey)
    if (val !== undefined && val !== null && val !== '') {
      const parts = cleanKey.split('.')
      return {
        resolved: true,
        value: val,
        matchType: 'dot_notation',
        category: parts[0],
        field: parts.slice(1).join('.'),
      }
    }
  }

  // 3. Tentar mapeador semântico automático existente no CRM
  const semanticRes = resolveSemanticVariableValue(cleanKey, {
    lead: context.lead,
    sizing: context.sizing,
    financial: context.financial,
    negotiation: context.negotiation,
  })

  if (
    semanticRes.resolved &&
    semanticRes.value !== undefined &&
    semanticRes.value !== null &&
    semanticRes.value !== ''
  ) {
    return {
      resolved: true,
      value: semanticRes.value,
      matchType: semanticRes.matchType || 'semantic',
      category: semanticRes.category,
      field: semanticRes.field,
    }
  }

  // 4. Verificação direta nos sub-objetos pelo nome da propriedade pura
  for (const cat of ['lead', 'negotiation', 'sizing', 'financial', 'company'] as const) {
    const subObj = context[cat]
    if (subObj && typeof subObj === 'object') {
      if (subObj[cleanKey] !== undefined && subObj[cleanKey] !== null && subObj[cleanKey] !== '') {
        return {
          resolved: true,
          value: subObj[cleanKey],
          matchType: 'direct_property',
          category: cat,
          field: cleanKey,
        }
      }
      if (subObj[lowerKey] !== undefined && subObj[lowerKey] !== null && subObj[lowerKey] !== '') {
        return {
          resolved: true,
          value: subObj[lowerKey],
          matchType: 'direct_property',
          category: cat,
          field: lowerKey,
        }
      }
    }
  }

  return { resolved: false, value: undefined }
}

/**
 * Converte Markdown simples para HTML seguro
 */
export function simpleMarkdownToHtml(markdown: string): string {
  if (!markdown) return ''

  // Escapar HTML perigoso básico
  let html = markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Títulos
  html = html.replace(
    /^### (.*$)/gim,
    '<h3 class="text-base font-bold text-slate-900 mt-4 mb-2 pb-1 border-b border-slate-200">$1</h3>',
  )
  html = html.replace(
    /^## (.*$)/gim,
    '<h2 class="text-lg font-bold text-slate-900 mt-6 mb-3 pb-1 border-b border-slate-300">$1</h2>',
  )
  html = html.replace(
    /^# (.*$)/gim,
    '<h1 class="text-xl font-extrabold text-slate-900 text-center mt-2 mb-6 tracking-tight">$1</h1>',
  )

  // Negrito e Itálico
  html = html.replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
  html = html.replace(
    /\*\*(.*?)\*\*/gim,
    '<strong class="font-semibold text-slate-900">$1</strong>',
  )
  html = html.replace(/\*(.*?)\*/gim, '<em class="italic text-slate-700">$1</em>')

  // Linha horizontal
  html = html.replace(/^---$/gim, '<hr class="my-5 border-t border-slate-200" />')

  // Listas não-ordenadas
  html = html.replace(
    /^\s*-\s+(.*$)/gim,
    '<li class="ml-4 list-disc text-slate-800 leading-relaxed">$1</li>',
  )

  // Parágrafos: quebras duplas
  const paragraphs = html.split(/\n{2,}/)
  html = paragraphs
    .map((p) => {
      const trimmed = p.trim()
      if (!trimmed) return ''
      if (
        trimmed.startsWith('<h1') ||
        trimmed.startsWith('<h2') ||
        trimmed.startsWith('<h3') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<li')
      ) {
        return trimmed
      }
      return `<p class="my-2.5 text-justify leading-relaxed text-slate-800 text-[13px]">${trimmed.replace(/\n/g, '<br/>')}</p>`
    })
    .join('\n')

  return html
}

/**
 * Preenche o template de contrato com os dados reais da negociação.
 * Identifica placeholders resolvidos e não resolvidos.
 */
export function resolveContractPlaceholders(
  templateContent: string,
  context: ContractContextData,
): ContractResolveOutput {
  const placeholderResults: PlaceholderResolutionResult[] = []
  const unresolvedKeys: string[] = []

  // Regex para achar {{chave}}
  const tagRegex = /\{\{([^{}]+)\}\}/g

  // 1. Substituir no texto pleno
  const resolvedContent = templateContent.replace(tagRegex, (match, rawKey) => {
    const key = rawKey.trim()
    const resolution = resolveSinglePlaceholder(key, context)

    if (resolution.resolved) {
      const formatted = formatValueForContract(key, resolution.value)
      placeholderResults.push({
        originalTag: match,
        key,
        resolved: true,
        value: String(resolution.value),
        formattedValue: formatted,
        matchType: resolution.matchType,
        field: resolution.field,
        category: resolution.category,
      })
      return formatted
    } else {
      unresolvedKeys.push(key)
      placeholderResults.push({
        originalTag: match,
        key,
        resolved: false,
        value: '',
        formattedValue: match,
      })
      return match
    }
  })

  // 2. Gerar versão com highlights para o preview interativo
  const htmlWithHighlights = templateContent.replace(tagRegex, (match, rawKey) => {
    const key = rawKey.trim()
    const resolution = resolveSinglePlaceholder(key, context)

    if (resolution.resolved) {
      const formatted = formatValueForContract(key, resolution.value)
      return `<span class="bg-emerald-50 text-emerald-950 font-semibold px-1 rounded border border-emerald-200" title="Placeholder resolvido: {{${key}}}">${formatted}</span>`
    } else {
      return `<mark class="bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded text-xs" title="Variável sem correspondência no CRM: {{${key}}}">⚠️ {{${key}}}</mark>`
    }
  })

  const htmlPreview = simpleMarkdownToHtml(htmlWithHighlights)
  const unresolvedCount = unresolvedKeys.length
  const totalCount = placeholderResults.length

  return {
    resolvedContent,
    htmlPreview,
    placeholders: placeholderResults,
    unresolvedCount,
    totalCount,
    unresolvedKeys: Array.from(new Set(unresolvedKeys)),
  }
}
