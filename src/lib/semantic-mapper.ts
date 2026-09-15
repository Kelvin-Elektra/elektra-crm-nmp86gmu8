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
      'geracao estimada',
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
    ],
    keywords: ['geracao', 'generation', 'producao', 'production'],
    negativeKeywords: ['consumo', 'consumption', 'potencia', 'kwp'],
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
    negativeKeywords: ['mensal', 'anual'],
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
    if (cObj && cObj[rawKey] !== undefined && cObj[rawKey] !== null && cObj[rawKey] !== '') {
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
        if (val !== undefined && val !== null && val !== '') {
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
        if (valT !== undefined && valT !== null && valT !== '') {
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
      if (valK !== undefined && valK !== null && valK !== '') {
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
  },
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

  const resolved: Record<string, any> = {}
  const unresolved: string[] = []

  for (const k of dynamicKeys) {
    const res = resolveSemanticVariableValue(k, payload)
    if (res.resolved) {
      resolved[k] = res
      if (res.category === 'lead') enrichedLead[k] = res.value
      else if (res.category === 'sizing') enrichedSizing[k] = res.value
      else if (res.category === 'financial') enrichedFinancial[k] = res.value
      else if (res.category === 'negotiation') enrichedNegotiation[k] = res.value
    } else {
      unresolved.push(k)
    }
  }

  return {
    lead: enrichedLead,
    negotiation: enrichedNegotiation,
    sizing: enrichedSizing,
    financial: enrichedFinancial,
    resolved,
    unresolved,
  }
}
