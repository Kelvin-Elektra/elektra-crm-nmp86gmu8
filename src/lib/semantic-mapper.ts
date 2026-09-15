/**
 * Mapeador Semântico de Variáveis Dinâmicas do Gerador de Propostas (Frontend & Backend)
 *
 * Permite inferir e resolver semanticamente, a partir do nome/chave declarada no contrato
 * (variable_schema.dynamic), qual valor das variáveis da negociação preencher.
 */

export function normalizeSemanticStr(str: string): string {
  if (!str || typeof str !== 'string') return ''
  let s = str.trim().toLowerCase()
  s = s
    .replace(/[áàâãä]/g, 'a')
    .replace(/[éèêë]/g, 'e')
    .replace(/[íìîï]/g, 'i')
    .replace(/[óòôõö]/g, 'o')
    .replace(/[úùûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
  s = s.replace(/[-_.:/\\()[\]]/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

const SEMANTIC_STOPWORDS: Record<string, boolean> = {
  de: true,
  do: true,
  da: true,
  dos: true,
  das: true,
  em: true,
  no: true,
  na: true,
  nos: true,
  nas: true,
  para: true,
  por: true,
  com: true,
  of: true,
  in: true,
  on: true,
  for: true,
  with: true,
  at: true,
  to: true,
  o: true,
  a: true,
  os: true,
  as: true,
  um: true,
  uma: true,
  uns: true,
  umas: true,
  the: true,
  an: true,
}

export function getSemanticTokenList(str: string): string[] {
  const norm = normalizeSemanticStr(str)
  if (!norm) return []
  const rawTokens = norm.split(' ')
  const tokens: string[] = []
  for (const t of rawTokens) {
    if (t && !SEMANTIC_STOPWORDS[t]) {
      tokens.push(t)
    }
  }
  return tokens
}

export interface SemanticConceptDef {
  concept: string
  targetCategory: 'lead' | 'sizing' | 'financial' | 'negotiation'
  targetField: string
  synonyms: string[]
  keywords: string[]
  negativeKeywords: string[]
}

export const SEMANTIC_CONCEPTS: SemanticConceptDef[] = [
  {
    concept: 'kit_power',
    targetCategory: 'sizing',
    targetField: 'kit_power_kwp',
    synonyms: [
      'kit power kwp',
      'kit power',
      'power kwp',
      'power',
      'potencia kit',
      'potencia instalada',
      'potencia do kit',
      'potencia',
      'kwp',
      'system size',
      'tamanho sistema',
      'potencia sistema',
      'potencia gerador',
      'kit potencia',
    ],
    keywords: ['potencia', 'kwp', 'power'],
    negativeKeywords: [
      'geracao',
      'generation',
      'producao',
      'consumo',
      'consumption',
      'inversor',
      'modulo',
    ],
  },
  {
    concept: 'module_qty',
    targetCategory: 'sizing',
    targetField: 'module_qty',
    synonyms: [
      'module qty',
      'module quantity',
      'modules count',
      'module count',
      'modules qty',
      'qtd modulos',
      'quantidade modulos',
      'numero modulos',
      'quant modulos',
      'qtd paineis',
      'quantidade paineis',
      'numero paineis',
      'quant paineis',
      'paineis solares',
      'modulos solares',
      'total modulos',
      'total paineis',
      'modulos',
      'paineis',
      'panels',
      'modules',
    ],
    keywords: ['modulo', 'modulos', 'painel', 'paineis', 'module', 'modules', 'panel', 'panels'],
    negativeKeywords: ['potencia', 'kwp', 'inversor', 'inverter'],
  },
  {
    concept: 'consumption',
    targetCategory: 'sizing',
    targetField: 'avg_consumption',
    synonyms: [
      'avg consumption',
      'average consumption',
      'average monthly consumption',
      'average monthly consumption kwh',
      'monthly consumption',
      'consumption kwh',
      'consumo medio',
      'consumo medio mensal',
      'consumo mensal',
      'consumo kwh',
      'consumo',
      'gasto energetico',
      'demanda energia',
      'consumo energia',
      'energy consumption',
      'monthly energy',
      'consumo medio kwh',
      'consumo medio mensal kwh',
    ],
    keywords: ['consumo', 'consumption', 'gasto'],
    negativeKeywords: ['geracao', 'generation', 'economia', 'savings', 'producao'],
  },
  {
    concept: 'generation',
    targetCategory: 'sizing',
    targetField: 'estimated_monthly_generation',
    synonyms: [
      'estimated monthly generation',
      'monthly generation',
      'generation kwh',
      'estimated generation',
      'estimated generation kwh',
      'generation estimated kwh',
      'geracao estimada',
      'geracao estimada kwh',
      'geracao media',
      'geracao media mensal',
      'geracao mensal',
      'geracao kwh',
      'geracao',
      'producao estimada',
      'producao mensal',
      'producao energia',
      'estimated production',
      'energy generation',
      'solar generation',
      'geracao solar',
      'geracao mensal estimada kwh',
    ],
    keywords: ['geracao', 'generation', 'producao', 'production'],
    negativeKeywords: ['consumo', 'consumption', 'potencia', 'kwp'],
  },
  {
    concept: 'consumption_coverage',
    targetCategory: 'sizing',
    targetField: 'consumption_coverage_pct',
    synonyms: [
      'consumption coverage pct',
      'consumption coverage',
      'coverage pct',
      'coverage',
      'cobertura consumo pct',
      'cobertura consumo',
      'cobertura percentual',
      'cobertura',
      'percentual cobertura',
      'taxa cobertura',
      'cobertura demanda',
      'energy coverage',
    ],
    keywords: ['cobertura', 'coverage'],
    negativeKeywords: ['area'],
  },
  {
    concept: 'occupied_area',
    targetCategory: 'sizing',
    targetField: 'occupied_area_m2',
    synonyms: [
      'occupied area m2',
      'occupied area',
      'area m2',
      'area',
      'area ocupada m2',
      'area ocupada',
      'area necessaria',
      'area instalacao',
      'area modulos',
      'area paineis',
      'area total modulos',
      'tamanho area',
      'required area',
      'installation area',
    ],
    keywords: ['area', 'ocupada', 'm2'],
    negativeKeywords: ['cobertura', 'co2'],
  },
  {
    concept: 'co2_avoided',
    targetCategory: 'financial',
    targetField: 'co2_avoided_ton',
    synonyms: [
      'co2 avoided ton',
      'co2 avoided',
      'co2 evitado ton',
      'co2 evitado',
      'co2 evitado toneladas',
      'emissoes evitadas',
      'toneladas co2',
      'co2 tons',
      'co2',
      'carbon avoided',
      'carbon offset',
      'reducao co2',
      'carbono evitado',
    ],
    keywords: ['co2', 'carbono', 'carbon', 'evitado'],
    negativeKeywords: [],
  },
  {
    concept: 'investment_multiple',
    targetCategory: 'financial',
    targetField: 'investment_multiple',
    synonyms: [
      'investment multiple',
      'multiplo investimento',
      'multiplo do investimento',
      'multiplo',
      'multiplicador investimento',
      'multiplo retorno',
      'multiple',
      'roi multiple',
    ],
    keywords: ['multiplo', 'multiple'],
    negativeKeywords: ['tir', 'irr'],
  },
  {
    concept: 'tir_pct',
    targetCategory: 'financial',
    targetField: 'tir_pct',
    synonyms: [
      'tir pct',
      'tir',
      'taxa interna retorno',
      'taxa interna de retorno',
      'irr pct',
      'irr',
      'internal rate return',
      'internal rate of return',
      'retorno tir',
      'tir anual',
    ],
    keywords: ['tir', 'irr', 'retorno'],
    negativeKeywords: ['payback', 'meses', 'tempo'],
  },
  {
    concept: 'consultant_name',
    targetCategory: 'negotiation',
    targetField: 'consultant_name',
    synonyms: [
      'consultant name',
      'consultant',
      'seller name',
      'seller',
      'salesperson',
      'representative',
      'consultor',
      'nome consultor',
      'nome do consultor',
      'vendedor',
      'nome vendedor',
      'nome do vendedor',
      'responsavel',
      'consultor comercial',
    ],
    keywords: ['consultor', 'vendedor', 'consultant', 'seller'],
    negativeKeywords: ['cliente', 'client'],
  },
  {
    concept: 'proposal_number',
    targetCategory: 'negotiation',
    targetField: 'proposal_number',
    synonyms: [
      'proposal number',
      'proposal code',
      'proposal id',
      'numero proposta',
      'codigo proposta',
      'num proposta',
      'nro proposta',
      'numero da proposta',
      'codigo da proposta',
    ],
    keywords: ['proposta', 'numero', 'codigo'],
    negativeKeywords: ['validade', 'data', 'consultor'],
  },
  {
    concept: 'proposal_date',
    targetCategory: 'negotiation',
    targetField: 'proposal_date',
    synonyms: [
      'proposal date',
      'creation date',
      'issue date',
      'data proposta',
      'data da proposta',
      'data emissao',
      'data de emissao',
      'data criacao',
    ],
    keywords: ['data', 'emissao', 'criacao'],
    negativeKeywords: ['validade', 'validity', 'prazo'],
  },
  {
    concept: 'validity_days',
    targetCategory: 'negotiation',
    targetField: 'validity_days',
    synonyms: [
      'validity days',
      'validity in days',
      'dias validade',
      'validade dias',
      'prazo validade dias',
      'validade em dias',
      'dias de validade',
      'numero dias validade',
    ],
    keywords: ['validade', 'dias'],
    negativeKeywords: [],
  },
  {
    concept: 'total_investment',
    targetCategory: 'financial',
    targetField: 'total_investment',
    synonyms: [
      'total investment',
      'investment total',
      'investment',
      'sale price',
      'price',
      'total value',
      'value total',
      'valor total',
      'investimento total',
      'total investimento',
      'investimento',
      'preco venda',
      'preco total',
      'preco',
      'valor sistema',
      'custo total',
      'total cost',
      'system price',
      'valor da proposta',
      'valor proposta',
      'valor total investimento',
    ],
    keywords: ['investimento', 'investment', 'preco', 'price'],
    negativeKeywords: ['economia', 'savings', 'mensal', 'payback', 'retorno'],
  },
  {
    concept: 'monthly_savings',
    targetCategory: 'financial',
    targetField: 'monthly_savings',
    synonyms: [
      'monthly savings',
      'estimated monthly savings',
      'economy monthly',
      'savings monthly',
      'economia mensal',
      'economia estimada',
      'economia media mensal',
      'economia mes',
      'economia',
      'estimated savings',
      'monthly economy',
    ],
    keywords: ['economia', 'savings', 'economy'],
    negativeKeywords: ['25', '25 anos', 'anual', 'annual', 'yearly', 'total'],
  },
  {
    concept: 'savings_25_years',
    targetCategory: 'financial',
    targetField: 'savings_25_years',
    synonyms: [
      'savings 25 years',
      'total savings 25y',
      'savings 25y',
      'total savings',
      'economia 25 anos',
      'economia 25y',
      'economia total 25 anos',
      'economia acumulada',
      'economia 25',
      '25 years savings',
      'savings 25',
    ],
    keywords: ['25', 'acumulada'],
    negativeKeywords: ['mensal', 'anual', 'projecao', 'projection'],
  },
  {
    concept: 'savings_projection',
    targetCategory: 'financial',
    targetField: 'savings_projection',
    synonyms: [
      'savings projection',
      'projecao economia',
      'projecao de economia',
      'savings milestones',
      'projection savings',
      'marcos economia',
      'tabela projecao',
      'projecao 25 anos',
    ],
    keywords: ['projecao', 'projection', 'marcos'],
    negativeKeywords: [],
  },
  {
    concept: 'annual_savings',
    targetCategory: 'financial',
    targetField: 'annual_savings',
    synonyms: [
      'annual savings',
      'yearly savings',
      'economia anual',
      'economia ano',
      'annual economy',
      'yearly economy',
    ],
    keywords: ['anual', 'annual', 'yearly', 'ano'],
    negativeKeywords: ['mensal', '25'],
  },
  {
    concept: 'payback_years',
    targetCategory: 'financial',
    targetField: 'payback_years',
    synonyms: [
      'payback years',
      'payback',
      'tempo retorno',
      'prazo retorno',
      'retorno investimento',
      'payback anos',
      'anos retorno',
      'tempo de retorno',
      'retorno',
    ],
    keywords: ['payback', 'retorno'],
    negativeKeywords: ['meses', 'months'],
  },
  {
    concept: 'payback_months',
    targetCategory: 'financial',
    targetField: 'payback_months',
    synonyms: [
      'payback months',
      'payback meses',
      'tempo retorno meses',
      'retorno meses',
      'meses retorno',
    ],
    keywords: ['payback', 'retorno'],
    negativeKeywords: [],
  },
  {
    concept: 'tariff',
    targetCategory: 'financial',
    targetField: 'tariff_rate',
    synonyms: [
      'tariff rate',
      'tariff',
      'tarifa',
      'tarifa energia',
      'valor tarifa',
      'tarifa concessionaria',
      'energy tariff',
      'tariff value',
    ],
    keywords: ['tarifa', 'tariff'],
    negativeKeywords: [],
  },
  {
    concept: 'lead_name',
    targetCategory: 'lead',
    targetField: 'name',
    synonyms: [
      'client name',
      'customer name',
      'lead name',
      'client',
      'customer',
      'lead',
      'nome cliente',
      'cliente',
      'nome do cliente',
      'nome titular',
      'titular',
      'nome consumidor',
      'consumidor',
    ],
    keywords: ['cliente', 'client', 'customer', 'titular', 'consumidor'],
    negativeKeywords: ['empresa', 'company'],
  },
  {
    concept: 'lead_document',
    targetCategory: 'lead',
    targetField: 'document',
    synonyms: [
      'client document',
      'document',
      'cpf cnpj',
      'cpf',
      'cnpj',
      'documento cliente',
      'documento titular',
      'doc titular',
      'cpf titular',
      'cnpj titular',
      'identificacao',
    ],
    keywords: ['cpf', 'cnpj', 'documento', 'document'],
    negativeKeywords: [],
  },
  {
    concept: 'lead_phone',
    targetCategory: 'lead',
    targetField: 'phone',
    synonyms: [
      'phone',
      'whatsapp',
      'telephone',
      'mobile',
      'celular',
      'telefone',
      'telefone cliente',
      'whatsapp cliente',
      'contato cliente',
      'contato',
    ],
    keywords: ['telefone', 'phone', 'whatsapp', 'celular', 'contato'],
    negativeKeywords: [],
  },
  {
    concept: 'lead_email',
    targetCategory: 'lead',
    targetField: 'email',
    synonyms: [
      'email',
      'client email',
      'customer email',
      'e mail',
      'email cliente',
      'e mail cliente',
      'correio eletronico',
    ],
    keywords: ['email', 'mail'],
    negativeKeywords: [],
  },
  {
    concept: 'address',
    targetCategory: 'lead',
    targetField: 'address',
    synonyms: [
      'address',
      'endereco',
      'full address',
      'endereco completo',
      'local instalacao',
      'endereco instalacao',
      'installation address',
      'localizacao',
    ],
    keywords: ['endereco', 'address', 'instalacao', 'local'],
    negativeKeywords: [],
  },
  {
    concept: 'city',
    targetCategory: 'lead',
    targetField: 'city',
    synonyms: ['city', 'cidade', 'municipio'],
    keywords: ['cidade', 'city', 'municipio'],
    negativeKeywords: [],
  },
  {
    concept: 'state',
    targetCategory: 'lead',
    targetField: 'state',
    synonyms: ['state', 'estado', 'uf'],
    keywords: ['estado', 'state', 'uf'],
    negativeKeywords: [],
  },
  {
    concept: 'validity',
    targetCategory: 'negotiation',
    targetField: 'validity',
    synonyms: [
      'validity',
      'validity date',
      'validade',
      'data validade',
      'validade proposta',
      'prazo validade',
      'expiration date',
    ],
    keywords: ['validade', 'validity'],
    negativeKeywords: [],
  },
  {
    concept: 'installation_lead_time',
    targetCategory: 'negotiation',
    targetField: 'installation_lead_time',
    synonyms: [
      'installation lead time',
      'lead time',
      'prazo instalacao',
      'prazo execucao',
      'tempo instalacao',
      'tempo execucao',
      'delivery time',
    ],
    keywords: ['prazo', 'lead time'],
    negativeKeywords: ['validade'],
  },
  {
    concept: 'payment_terms',
    targetCategory: 'negotiation',
    targetField: 'payment_terms',
    synonyms: [
      'payment terms',
      'condicoes pagamento',
      'forma pagamento',
      'condicao pagamento',
      'formas pagamento aceitas',
      'pagamento',
      'payment method',
      'defined payment method',
    ],
    keywords: ['pagamento', 'payment'],
    negativeKeywords: [],
  },
  {
    concept: 'concessionaire',
    targetCategory: 'sizing',
    targetField: 'concessionaire',
    synonyms: [
      'concessionaire',
      'distributor',
      'distribuidora',
      'concessionaria',
      'concessionaria energia',
      'utility company',
    ],
    keywords: ['concessionaria', 'distribuidora', 'utility'],
    negativeKeywords: [],
  },
  {
    concept: 'consumer_category',
    targetCategory: 'sizing',
    targetField: 'consumer_category',
    synonyms: [
      'consumer category',
      'categoria consumo',
      'categoria consumidor',
      'tipo consumidor',
      'classe consumo',
      'consumer type',
    ],
    keywords: ['categoria', 'classe'],
    negativeKeywords: [],
  },
  {
    concept: 'equipments',
    targetCategory: 'sizing',
    targetField: 'equipments',
    synonyms: [
      'equipments',
      'equipamentos',
      'equipamentos especificados',
      'tabela equipamentos',
      'lista equipamentos',
      'equipment list',
      'equipments list',
      'itens kit',
      'kit equipamentos',
    ],
    keywords: ['equipamentos', 'equipments', 'equipamento'],
    negativeKeywords: ['condicoes', 'comerciais', 'pagamento'],
  },
  {
    concept: 'commercial_conditions',
    targetCategory: 'negotiation',
    targetField: 'commercial_conditions',
    synonyms: [
      'commercial conditions',
      'condicoes comerciais',
      'condicoes',
      'tabela condicoes comerciais',
      'tabela condicoes',
      'termos comerciais',
      'commercial terms',
    ],
    keywords: ['condicoes', 'comerciais', 'commercial', 'conditions'],
    negativeKeywords: ['equipamentos', 'equipments'],
  },
]

export interface SemanticResolutionResult {
  resolved: boolean
  category?: 'lead' | 'sizing' | 'financial' | 'negotiation'
  field?: string
  value?: any
  matchType?: 'exact_key' | 'semantic_synonym' | 'semantic_token_order' | 'semantic_keyword'
}

export function resolveSemanticVariableValue(
  rawKey: string,
  context: {
    lead?: Record<string, any>
    sizing?: Record<string, any>
    financial?: Record<string, any>
    negotiation?: Record<string, any>
  },
): SemanticResolutionResult {
  if (!rawKey || typeof rawKey !== 'string') return { resolved: false }
  const normKey = normalizeSemanticStr(rawKey)
  const keyTokens = getSemanticTokenList(rawKey)

  // (a) Correspondência exata em qualquer categoria
  const cats: Array<'lead' | 'sizing' | 'financial' | 'negotiation'> = [
    'lead',
    'sizing',
    'financial',
    'negotiation',
  ]
  for (const cName of cats) {
    const cObj = context[cName]
    if (
      cObj &&
      cObj[rawKey] !== undefined &&
      cObj[rawKey] !== null &&
      (typeof cObj[rawKey] === 'object' || cObj[rawKey] !== '')
    ) {
      return {
        resolved: true,
        category: cName,
        field: rawKey,
        value: cObj[rawKey],
        matchType: 'exact_key',
      }
    }
  }

  // (b) Correspondência semântica via sinônimos
  for (const sc of SEMANTIC_CONCEPTS) {
    for (const syn of sc.synonyms) {
      if (normKey === normalizeSemanticStr(syn)) {
        const val = context[sc.targetCategory]
          ? context[sc.targetCategory]![sc.targetField]
          : undefined
        if (val !== undefined && val !== null && (typeof val === 'object' || val !== '')) {
          return {
            resolved: true,
            category: sc.targetCategory,
            field: sc.targetField,
            value: val,
            matchType: 'semantic_synonym',
          }
        }
      }
    }
  }

  // (c) Correspondência semântica por ordem de tokens (ex: "total_investment" = "investment_total")
  const sortedKey = keyTokens.slice().sort().join(' ')
  for (const tc of SEMANTIC_CONCEPTS) {
    for (const syn of tc.synonyms) {
      const synTokens = getSemanticTokenList(syn)
      if (sortedKey === synTokens.slice().sort().join(' ') && sortedKey.length > 0) {
        const valT = context[tc.targetCategory]
          ? context[tc.targetCategory]![tc.targetField]
          : undefined
        if (valT !== undefined && valT !== null && (typeof valT === 'object' || valT !== '')) {
          return {
            resolved: true,
            category: tc.targetCategory,
            field: tc.targetField,
            value: valT,
            matchType: 'semantic_token_order',
          }
        }
      }
    }
  }

  // (d) Correspondência por palavras-chave com penalização de palavras negativas
  let bestMatch: SemanticResolutionResult | null = null
  let bestScore = 0
  for (const kc of SEMANTIC_CONCEPTS) {
    let hasNeg = false
    for (const neg of kc.negativeKeywords) {
      if (normKey.includes(neg)) {
        hasNeg = true
        break
      }
    }
    if (hasNeg) continue

    let score = 0
    for (const kw of kc.keywords) {
      if (normKey.includes(kw)) score++
    }

    if (score > 0 && score > bestScore) {
      const valK = context[kc.targetCategory]
        ? context[kc.targetCategory]![kc.targetField]
        : undefined
      if (valK !== undefined && valK !== null && (typeof valK === 'object' || valK !== '')) {
        bestScore = score
        bestMatch = {
          resolved: true,
          category: kc.targetCategory,
          field: kc.targetField,
          value: valK,
          matchType: 'semantic_keyword',
        }
      }
    }
  }

  if (bestMatch) return bestMatch
  return { resolved: false }
}

export function enrichPayloadWithSemanticVariables(
  dynamicSchema: any,
  payload: {
    lead: Record<string, any>
    negotiation: Record<string, any>
    sizing: Record<string, any>
    financial: Record<string, any>
    [key: string]: any
  },
  manualMappings?: Record<string, string> | null,
) {
  const dynamicKeys: string[] = []
  if (Array.isArray(dynamicSchema)) {
    for (const item of dynamicSchema) {
      const key = typeof item === 'string' ? item : item.key || item.name || ''
      if (key) dynamicKeys.push(key)
    }
  } else if (dynamicSchema && typeof dynamicSchema === 'object') {
    dynamicKeys.push(...Object.keys(dynamicSchema))
  }

  const enrichedLead = { ...payload.lead }
  const enrichedNegotiation = { ...payload.negotiation }
  const enrichedSizing = { ...payload.sizing }
  const enrichedFinancial = { ...payload.financial }
  const dynamicMap: Record<string, any> = {}

  const resolved: Record<string, any> = {}
  const unresolved: string[] = []

  // Helper para ler dot-notation
  const getDotValue = (obj: any, path: string): any => {
    if (!obj || !path) return undefined
    const parts = path.split('.')
    let curr = obj
    for (const p of parts) {
      if (curr === null || curr === undefined || typeof curr !== 'object') return undefined
      curr = curr[p]
    }
    return curr
  }

  for (const k of dynamicKeys) {
    let resolvedValue: any = undefined
    let resolutionCategory: string = ''
    let resolutionField: string = ''
    let resolutionType: string = ''

    // 1. Prioridade máxima: Mapeamento Manual do ADM
    const manualPath = manualMappings ? manualMappings[k] : null
    if (manualPath && typeof manualPath === 'string' && manualPath.trim() !== '') {
      const pClean = manualPath.trim()
      let val = getDotValue(payload, pClean)
      if (val === undefined) {
        val =
          getDotValue(enrichedFinancial, pClean) ||
          getDotValue(enrichedSizing, pClean) ||
          getDotValue(enrichedLead, pClean) ||
          getDotValue(enrichedNegotiation, pClean)
      }
      if (val !== undefined && val !== null && (typeof val === 'object' || val !== '')) {
        resolvedValue = val
        resolutionCategory = 'manual'
        resolutionField = pClean
        resolutionType = 'manual_override'
      }
    }

    // 2. Prioridade secundária: Exata e Semântica
    if (resolvedValue === undefined) {
      const res = resolveSemanticVariableValue(k, payload)
      if (
        res.resolved &&
        res.value !== undefined &&
        res.value !== null &&
        (typeof res.value === 'object' || res.value !== '')
      ) {
        resolvedValue = res.value
        resolutionCategory = res.category || ''
        resolutionField = res.field || ''
        resolutionType = res.matchType || 'semantic'
      }
    }
    if (resolvedValue !== undefined) {
      dynamicMap[k] = resolvedValue
      resolved[k] = {
        resolved: true,
        category: resolutionCategory,
        field: resolutionField,
        value: resolvedValue,
        matchType: resolutionType,
      }
      if (resolutionCategory === 'lead') enrichedLead[k] = resolvedValue
      else if (resolutionCategory === 'sizing') enrichedSizing[k] = resolvedValue
      else if (resolutionCategory === 'financial') enrichedFinancial[k] = resolvedValue
      else if (resolutionCategory === 'negotiation') enrichedNegotiation[k] = resolvedValue
      else {
        // Enriquecer em sizing/financial/negotiation como fallback
        enrichedSizing[k] = resolvedValue
        enrichedFinancial[k] = resolvedValue
        enrichedNegotiation[k] = resolvedValue
      }
    } else {
      unresolved.push(k)
    }
  }

  return {
    lead: enrichedLead,
    negotiation: enrichedNegotiation,
    sizing: enrichedSizing,
    financial: enrichedFinancial,
    dynamic: dynamicMap,
    resolved,
    unresolved,
  }
}
