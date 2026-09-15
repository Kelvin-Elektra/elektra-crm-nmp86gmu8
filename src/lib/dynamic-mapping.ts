import { resolveSemanticVariableValue } from './semantic-mapper'

export interface CrmFieldDefinition {
  path: string
  label: string
  section: 'lead' | 'negotiation' | 'sizing' | 'financial' | 'company'
  type?: string
  description?: string
}

export interface CrmFieldSection {
  id: 'lead' | 'negotiation' | 'sizing' | 'financial' | 'company'
  label: string
  fields: CrmFieldDefinition[]
}

export const CRM_FIELD_SECTIONS: CrmFieldSection[] = [
  {
    id: 'lead',
    label: 'Cliente / Lead',
    fields: [
      { path: 'lead.name', label: 'Nome do Cliente / Titular', section: 'lead' },
      { path: 'lead.document', label: 'Documento (CPF / CNPJ)', section: 'lead' },
      { path: 'lead.phone', label: 'Telefone / WhatsApp', section: 'lead' },
      { path: 'lead.email', label: 'E-mail do Cliente', section: 'lead' },
      { path: 'lead.address', label: 'Endereço Completo', section: 'lead' },
      { path: 'lead.city', label: 'Cidade do Cliente', section: 'lead' },
      { path: 'lead.state', label: 'Estado (UF) do Cliente', section: 'lead' },
      { path: 'lead.cep', label: 'CEP do Cliente', section: 'lead' },
      { path: 'lead.neighborhood', label: 'Bairro do Cliente', section: 'lead' },
      { path: 'lead.number', label: 'Número do Endereço', section: 'lead' },
    ],
  },
  {
    id: 'negotiation',
    label: 'Negociação',
    fields: [
      {
        path: 'negotiation.title',
        label: 'Título da Negociação / Projeto',
        section: 'negotiation',
      },
      { path: 'negotiation.validity', label: 'Prazo / Data de Validade', section: 'negotiation' },
      {
        path: 'negotiation.payment_terms',
        label: 'Condições de Pagamento',
        section: 'negotiation',
      },
      {
        path: 'negotiation.defined_payment_method',
        label: 'Forma de Pagamento Definida',
        section: 'negotiation',
      },
      {
        path: 'negotiation.accepted_payment_methods',
        label: 'Formas de Pagamento Aceitas',
        section: 'negotiation',
      },
      {
        path: 'negotiation.installation_lead_time',
        label: 'Prazo de Execução / Instalação',
        section: 'negotiation',
      },
      { path: 'negotiation.notes', label: 'Observações Internas', section: 'negotiation' },
      { path: 'negotiation.description', label: 'Descrição da Proposta', section: 'negotiation' },
      { path: 'negotiation.uc', label: 'Unidade Consumidora (UC)', section: 'negotiation' },
    ],
  },
  {
    id: 'sizing',
    label: 'Dimensionamento',
    fields: [
      { path: 'sizing.kit_power_kwp', label: 'Potência do Kit (kWp)', section: 'sizing' },
      { path: 'sizing.avg_consumption', label: 'Consumo Médio Mensal (kWh)', section: 'sizing' },
      {
        path: 'sizing.estimated_monthly_generation',
        label: 'Geração Mensal Estimada (kWh)',
        section: 'sizing',
      },
      { path: 'sizing.module_qty', label: 'Quantidade de Módulos (Painéis)', section: 'sizing' },
      {
        path: 'sizing.consumer_category',
        label: 'Categoria de Consumo (Residencial/etc)',
        section: 'sizing',
      },
      { path: 'sizing.concessionaire', label: 'Concessionária de Energia', section: 'sizing' },
      { path: 'sizing.roof_type', label: 'Tipo de Telhado / Estrutura', section: 'sizing' },
      {
        path: 'sizing.network_type',
        label: 'Tipo de Rede (Monofásico/Trifásico)',
        section: 'sizing',
      },
      {
        path: 'sizing.simultaneity_factor',
        label: 'Fator de Simultaneidade (%)',
        section: 'sizing',
      },
      {
        path: 'address_struct.city',
        label: 'Cidade da Usina (address_struct.city)',
        section: 'sizing',
      },
      {
        path: 'address_struct.state',
        label: 'Estado da Usina (address_struct.state)',
        section: 'sizing',
      },
      {
        path: 'address_struct.street',
        label: 'Rua da Instalação (address_struct.street)',
        section: 'sizing',
      },
      {
        path: 'address_struct.number',
        label: 'Número da Instalação (address_struct.number)',
        section: 'sizing',
      },
      {
        path: 'address_struct.zip',
        label: 'CEP da Instalação (address_struct.zip)',
        section: 'sizing',
      },
    ],
  },
  {
    id: 'financial',
    label: 'Financeiro',
    fields: [
      {
        path: 'financial.total_investment',
        label: 'Investimento Total / Preço Final (R$)',
        section: 'financial',
      },
      {
        path: 'financial.monthly_savings',
        label: 'Economia Mensal Estimada (R$)',
        section: 'financial',
      },
      {
        path: 'financial.annual_savings',
        label: 'Economia Anual Estimada (R$)',
        section: 'financial',
      },
      {
        path: 'financial.savings_25_years',
        label: 'Economia Total em 25 Anos (R$)',
        section: 'financial',
      },
      {
        path: 'financial.payback_years',
        label: 'Tempo de Retorno / Payback (Anos)',
        section: 'financial',
      },
      {
        path: 'financial.payback_months',
        label: 'Tempo de Retorno / Payback (Meses)',
        section: 'financial',
      },
      {
        path: 'financial.tariff_rate',
        label: 'Tarifa de Energia Atual (R$/kWh)',
        section: 'financial',
      },
      {
        path: 'tariff_details.te',
        label: 'Componente TE da Tarifa (R$/kWh)',
        section: 'financial',
      },
      {
        path: 'tariff_details.tusd',
        label: 'Componente TUSD da Tarifa (R$/kWh)',
        section: 'financial',
      },
      {
        path: 'financial.subtotal',
        label: 'Subtotal antes do Desconto (R$)',
        section: 'financial',
      },
      {
        path: 'financial.discount_amount',
        label: 'Valor do Desconto Aplicado (R$)',
        section: 'financial',
      },
    ],
  },
  {
    id: 'company',
    label: 'Empresa',
    fields: [
      { path: 'company.name', label: 'Nome da Empresa Integradora', section: 'company' },
      { path: 'company.cnpj', label: 'CNPJ da Empresa', section: 'company' },
      { path: 'company.logo', label: 'URL do Logo da Empresa', section: 'company' },
      { path: 'company.phone', label: 'Telefone da Empresa', section: 'company' },
      { path: 'company.email', label: 'E-mail da Empresa', section: 'company' },
    ],
  },
]

export const ALL_CRM_FIELDS: CrmFieldDefinition[] = CRM_FIELD_SECTIONS.flatMap((s) => s.fields)

export function getFieldByPath(path: string): CrmFieldDefinition | undefined {
  return ALL_CRM_FIELDS.find((f) => f.path === path)
}

export function getValueByDotNotation(obj: any, path: string): any {
  if (!obj || !path) return undefined
  const parts = path.split('.')
  let curr = obj
  for (const p of parts) {
    if (curr === null || curr === undefined || typeof curr !== 'object') return undefined
    curr = curr[p]
  }
  return curr
}

export type DynamicFieldStatus = 'manual' | 'auto' | 'empty' | 'unmapped'

export interface EvaluatedDynamicField {
  key: string
  label: string
  type: string
  required: boolean
  defaultVal?: any
  description?: string
  status: DynamicFieldStatus
  manualMapping: string | null
  effectivePath: string | null
  effectiveValue: any
  autoSuggestion: {
    category?: string
    field?: string
    path?: string
    matchType?: string
  } | null
}

/**
 * Avalia o status de mapeamento de cada variável dinâmica do template.
 * - Ordem: (1) Override manual salvo do ADM -> (2) Exato / Semântico Automático.
 * - Status possíveis:
 *   - 'manual': ADM definiu override explícito e há valor disponível.
 *   - 'auto': resolvida pelo mapeador semântico automático e há valor.
 *   - 'empty': mapeada (manual ou auto), mas o valor na negociação está vazio/nulo/indefinido.
 *   - 'unmapped': nenhuma correspondência encontrada.
 */
export function evaluateDynamicFieldStatus(
  fieldKey: string,
  fieldDef: {
    label?: string
    type?: string
    required?: boolean
    default?: any
    description?: string
  },
  manualMapping: string | null | undefined,
  sampleNegotiationData: {
    lead?: Record<string, any>
    negotiation?: Record<string, any>
    sizing?: Record<string, any>
    financial?: Record<string, any>
    company?: Record<string, any>
    address_struct?: Record<string, any>
    tariff_details?: Record<string, any>
    [key: string]: any
  },
): EvaluatedDynamicField {
  const label = fieldDef.label || fieldKey
  const type = fieldDef.type || 'text'
  const required = !!fieldDef.required
  const defaultVal = fieldDef.default
  const description = fieldDef.description

  // 1. Resolução semântica automática para sugestão
  const autoRes = resolveSemanticVariableValue(fieldKey, {
    lead: sampleNegotiationData.lead,
    sizing: sampleNegotiationData.sizing,
    financial: sampleNegotiationData.financial,
    negotiation: sampleNegotiationData.negotiation,
  })

  let autoPath: string | null = null
  if (autoRes.resolved && autoRes.category && autoRes.field) {
    autoPath = `${autoRes.category}.${autoRes.field}`
  }

  const autoSuggestion = autoRes.resolved
    ? {
        category: autoRes.category,
        field: autoRes.field,
        path: autoPath || undefined,
        matchType: autoRes.matchType,
      }
    : null

  // 2. Verificar se há override manual configurado
  const hasManual = typeof manualMapping === 'string' && manualMapping.trim() !== ''

  if (hasManual) {
    const p = manualMapping.trim()
    let val = getValueByDotNotation(sampleNegotiationData, p)
    if (
      val === undefined &&
      p.startsWith('tariff_details.') &&
      sampleNegotiationData.financial?.tariff_details
    ) {
      val = getValueByDotNotation(sampleNegotiationData.financial, p)
    }
    if (
      val === undefined &&
      p.startsWith('address_struct.') &&
      sampleNegotiationData.sizing?.address_struct
    ) {
      val = getValueByDotNotation(sampleNegotiationData.sizing, p)
    }

    const isEmpty = val === undefined || val === null || val === ''
    return {
      key: fieldKey,
      label,
      type,
      required,
      defaultVal,
      description,
      status: isEmpty ? 'empty' : 'manual',
      manualMapping: p,
      effectivePath: p,
      effectiveValue: val,
      autoSuggestion,
    }
  }

  // 3. Sem override manual -> usar automático
  if (autoRes.resolved && autoPath) {
    const val = autoRes.value
    const isEmpty = val === undefined || val === null || val === ''
    return {
      key: fieldKey,
      label,
      type,
      required,
      defaultVal,
      description,
      status: isEmpty ? 'empty' : 'auto',
      manualMapping: null,
      effectivePath: autoPath,
      effectiveValue: val,
      autoSuggestion,
    }
  }

  // 4. Não mapeada
  return {
    key: fieldKey,
    label,
    type,
    required,
    defaultVal,
    description,
    status: 'unmapped',
    manualMapping: null,
    effectivePath: null,
    effectiveValue: undefined,
    autoSuggestion: null,
  }
}
