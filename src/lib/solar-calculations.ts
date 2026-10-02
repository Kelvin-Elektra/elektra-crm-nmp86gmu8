/**
 * Módulo de Cálculos Solares Compartilhado
 *
 * Centraliza as fórmulas de engenharia e financeiras exigidas pelo Gerador de Propostas:
 * - Cobertura de consumo (consumption_coverage_pct)
 * - Área ocupada pelos módulos (occupied_area_m2)
 * - Emissão de CO2 evitada (co2_avoided_ton) com fator do grid brasileiro
 * - Múltiplo de investimento (investment_multiple)
 * - TIR anual via bisseção numérica (tir_pct)
 * - Economia acumulada em 25 anos (savings_25_years)
 * - Extração de geração estimada com fallbacks (estimated_monthly_generation)
 * - Formatação e cálculo de dias de validade (validity_days)
 */

/**
 * Fator médio oficial de emissão da rede elétrica brasileira (MCTI/ONS)
 * Valor: 0,0385 kg CO₂ / kWh = 0,0000385 t CO₂ / kWh
 * Fórmula: geração anual (kWh) * BRAZIL_GRID_EMISSION_FACTOR
 * ou: (geração mensal * 12 * 0,0385) / 1000 toneladas
 */
export const BRAZIL_GRID_EMISSION_FACTOR = 0.0000385

/**
 * Área padrão de módulo fotovoltaico moderno de alta potência (m²)
 * Utilizada como fallback caso o módulo não tenha dimensões cadastradas.
 * ~2,58 m² (ex: 2.278m x 1.134m para módulos 550W-700W)
 */
export const DEFAULT_MODULE_AREA_M2 = 2.58

/**
 * 1. Cobertura de consumo (%)
 * Geração mensal estimada ÷ consumo médio mensal × 100
 * Ex: 624 / 500 = 124.8%
 */
export function calculateConsumptionCoverage(
  generationKwh: number,
  consumptionKwh: number,
): number {
  const gen = Number(generationKwh) || 0
  const cons = Number(consumptionKwh) || 0
  if (cons <= 0 || gen <= 0) return 0
  return Number(((gen / cons) * 100).toFixed(1))
}

/**
 * 2. Área ocupada (m²)
 * Área unitária do módulo x quantidade de módulos.
 * Trata dimensões em milímetros (ex: 2278x1134) convertendo para metros se > 10.
 */
export function calculateOccupiedArea(
  moduleQty: number,
  moduleDimensions?: { height?: number; width?: number; area?: number } | null,
): number {
  const qty = Number(moduleQty) || 0
  if (qty <= 0) return 0

  let unitArea = 0
  if (moduleDimensions) {
    if (moduleDimensions.area && moduleDimensions.area > 0) {
      unitArea = Number(moduleDimensions.area)
    } else {
      let h = Number(moduleDimensions.height) || 0
      let w = Number(moduleDimensions.width) || 0
      // Se dimensões estiverem em mm (ex: > 10), converter para metros dividindo por 1000
      if (h > 10) h = h / 1000
      if (w > 10) w = w / 1000
      if (h > 0 && w > 0) {
        unitArea = h * w
      }
    }
  }

  // Fallback padrão se não houver dimensões cadastradas
  if (unitArea <= 0) {
    unitArea = DEFAULT_MODULE_AREA_M2
  }

  return Number((unitArea * qty).toFixed(1))
}

/**
 * 3. CO₂ evitado (toneladas/ano)
 * Fórmula: geração mensal * 12 * 0,0385 / 1000
 * Equivalente a: geração mensal * 12 * BRAZIL_GRID_EMISSION_FACTOR
 */
export function calculateCo2Avoided(monthlyGenerationKwh: number): number {
  const gen = Number(monthlyGenerationKwh) || 0
  if (gen <= 0) return 0
  const annualGen = gen * 12
  const tons = annualGen * BRAZIL_GRID_EMISSION_FACTOR
  return Number(tons.toFixed(2))
}

/**
 * 4. Múltiplo do investimento (ex: 11.3)
 * Fórmula: savings_25_years ÷ total_investment
 * Retorna número com 1 casa decimal (ex: 11.3).
 */
export function calculateInvestmentMultiple(
  savings25Years: number,
  totalInvestment: number,
): number {
  const sav = Number(savings25Years) || 0
  const inv = Number(totalInvestment) || 0
  if (inv <= 0 || sav <= 0) return 0
  return Number((sav / inv).toFixed(1))
}

/**
 * 5. TIR anual (%) via bisseção numérica sobre fluxo de caixa de 25 anos
 * Fluxo:
 *   Ano 0: -totalInvestment
 *   Anos 1 a 25: annualSavings
 *
 * Retorna taxa percentual anual com 1 casa decimal (ex: 45.1).
 * Em caso de valores inconsistentes ou não convergência, retorna 0.
 */
export function calculateTir(
  totalInvestment: number,
  annualSavings: number,
  years: number = 25,
): number {
  const I0 = Number(totalInvestment) || 0
  const S = Number(annualSavings) || 0

  if (I0 <= 0 || S <= 0) return 0

  // Se a economia total em N anos não cobrir o investimento, TIR é negativa ou 0
  if (S * years <= I0) return 0

  // VPL(r) = -I0 + sum_{t=1..N} (S / (1+r)^t)
  // Como S é constante: VPL(r) = -I0 + S * [1 - (1+r)^(-N)] / r
  function vpl(r: number): number {
    if (r === 0) return S * years - I0
    return -I0 + (S * (1 - Math.pow(1 + r, -years))) / r
  }

  let low = 0.0001 // 0.01%
  let high = 5.0 // 500%

  // Se mesmo com high o VPL ainda for positivo, expande limite superior
  while (vpl(high) > 0 && high < 50.0) {
    high *= 2
  }

  // Se o VPL no mínimo for negativo, não há solução viável no intervalo positivo
  if (vpl(low) < 0) return 0

  // Bisseção com até 100 iterações ou tolerância < 1e-6
  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2
    const vMid = vpl(mid)
    if (Math.abs(vMid) < 1e-6 || (high - low) / 2 < 1e-6) {
      return Number((mid * 100).toFixed(1))
    }
    if (vMid > 0) {
      low = mid
    } else {
      high = mid
    }
  }

  return Number((((low + high) / 2) * 100).toFixed(1))
}

/**
 * 6. Economia acumulada em 25 anos (R$)
 * Fórmula padrão do Elektra CRM:
 *   savings_25_years = annual_savings * 25 (ou monthly_savings * 12 * 25)
 * Garante consistência com fallback.
 */
export function calculateSavings25Years(annualSavings?: number, monthlySavings?: number): number {
  const ann = Number(annualSavings) || 0
  if (ann > 0) {
    return Number((ann * 25).toFixed(2))
  }
  const mon = Number(monthlySavings) || 0
  if (mon > 0) {
    return Number((mon * 12 * 25).toFixed(2))
  }
  return 0
}

export interface EquipmentItem {
  item: string
  specification: string
  quantity: string
  warranty: string
}

export interface CommercialConditionItem {
  item: string
  condicao: string
}

/**
 * Normaliza número de anos para formato padrão "X anos" ou "X a"
 */
function formatWarrantyYears(val: any, defaultFallback: string = '-'): string {
  if (val === undefined || val === null || val === '') return defaultFallback
  const s = String(val).trim()
  if (!s || s === '-') return defaultFallback
  if (/^\d+$/.test(s)) {
    return `${s} anos`
  }
  return s
}

/**
 * Constrói o array `equipments` esperado pelos templates de proposta (ex: Template 2)
 * Ordem:
 * 1. Módulos da proposta: item = nome/modelo, especificacao = potência etc., qtd = module_qty, garantia = catálogo (ex: "25 anos")
 * 2. Inversores da proposta: item = marca/modelo, especificacao = potência etc., qtd, garantia = catálogo (ex: "10 anos")
 *    - Se não houver inversor selecionado, omite a linha sem quebrar o array
 * 3. Insumos do kit (estrutura, cabos, conectores etc.): item = nome do insumo, especificacao = tipo/base, qtd, garantia = "-"
 */
export function buildEquipmentsArray(params: {
  module?: {
    name?: string
    brand?: string
    power?: number
    notes?: string
    warranty?: string
    [key: string]: any
  } | null
  moduleQty?: number
  inverters?: Array<{
    name?: string
    brand?: string
    power?: number
    voltage?: string
    type?: string
    qty?: number
    quantity?: number
    warranty?: string
    [key: string]: any
  }> | null
  supplies?: Array<{
    name?: string
    qty?: number
    quantity?: number
    type?: string
    calcBase?: string
    calc_base?: string
    specification?: string
    [key: string]: any
  }> | null
}): EquipmentItem[] {
  const items: EquipmentItem[] = []

  // 1. Módulos
  const qty = Number(params.moduleQty) || 0
  const mod = params.module
  if (qty > 0 || mod) {
    const brand = mod?.brand ? String(mod.brand).trim() : ''
    const name = mod?.name ? String(mod.name).trim() : ''
    let itemName = ''
    if (brand && name && !name.toLowerCase().includes(brand.toLowerCase())) {
      itemName = `${brand} ${name}`
    } else {
      itemName = name || brand || 'Módulo Fotovoltaico'
    }

    const powerStr = mod?.power ? `${mod.power}W` : ''
    const extraSpec = mod?.frame ? `Frame: ${mod.frame}` : ''
    const spec = [powerStr, extraSpec].filter(Boolean).join(' · ') || 'Alta Eficiência'

    const rawModWarranty =
      mod?.warranty_manufacturing ||
      mod?.warranty ||
      mod?.notes?.match(/(\d+)\s*anos?/i)?.[0] ||
      '25 anos'
    const modWarranty = formatWarrantyYears(rawModWarranty, '25 anos')

    items.push({
      item: itemName,
      specification: spec,
      quantity: String(qty > 0 ? qty : 1),
      warranty: modWarranty,
    })
  }

  // 2. Inversores
  const inverters = params.inverters || []
  if (Array.isArray(inverters) && inverters.length > 0) {
    for (const inv of inverters) {
      const invQty = Number(inv.qty || inv.quantity || 1)
      if (invQty <= 0 && !inv.name) continue

      const brand = inv.brand ? String(inv.brand).trim() : ''
      const name = inv.name ? String(inv.name).trim() : ''
      let invName = ''
      if (brand && name && !name.toLowerCase().includes(brand.toLowerCase())) {
        invName = `${brand} ${name}`
      } else {
        invName = name || brand || 'Inversor Solar'
      }

      const powerStr = inv.power ? `${inv.power} kW` : ''
      const typeStr = inv.type ? String(inv.type) : ''
      const voltStr = inv.voltage ? String(inv.voltage) : ''
      const spec =
        [powerStr, typeStr, voltStr].filter(Boolean).join(' · ') || 'Inversor de Conexão à Rede'

      const invWarranty = formatWarrantyYears(inv.warranty, '10 anos')

      items.push({
        item: invName,
        specification: spec,
        quantity: String(invQty > 0 ? invQty : 1),
        warranty: invWarranty,
      })
    }
  }

  // 3. Insumos do kit
  const supplies = params.supplies || []
  if (Array.isArray(supplies) && supplies.length > 0) {
    for (const sup of supplies) {
      // Pular se for o próprio módulo ou inversor marcado como type module/inverter no kitComposition
      if (sup.type === 'module' || sup.type === 'inverter') continue

      const sName = String(sup.name || 'Insumo').trim()
      if (!sName) continue

      const sQty = Number(sup.qty || sup.quantity || 1)
      const formattedQty = Number.isInteger(sQty) ? sQty : Number(sQty.toFixed(1))

      const spec =
        sup.specification ||
        (sup.type === 'supply' ? 'Material de Instalação e Proteção' : 'Componente Homologado')

      items.push({
        item: sName,
        specification: spec,
        quantity: String(formattedQty > 0 ? formattedQty : 1),
        warranty: '-', // Insumos sem garantia declarada levam traço "-"
      })
    }
  }

  return items
}

/**
 * Constrói o array `commercial_conditions` esperado pelos templates de proposta (ex: Template 2)
 *
 * Itens obrigatórios pelo template:
 * - Pagamento: payment_terms / defined_payment_method / accepted_payment_methods
 * - Financiamento: opções de financiamento disponíveis (ex: "Até 84 meses" ou descrição)
 * - Validade: dias de validade (ex: "15 dias")
 * - Prazo de entrega: prazo de instalação / execução (ex: "Até 45 dias")
 * - Garantias: resumo das garantias (módulos, inversor, instalação)
 */
export function buildCommercialConditionsArray(params: {
  paymentTerms?: string
  definedPaymentMethod?: string
  acceptedPaymentMethods?: string | string[]
  validityDays?: number | string
  installationLeadTime?: string
  moduleWarranty?: string
  inverterWarranty?: string
  workmanshipWarranty?: string
  financingTerms?: string
}): CommercialConditionItem[] {
  // 1. Pagamento
  let paymentText = '-'
  const terms = (params.paymentTerms || '').trim()
  const defined = (params.definedPaymentMethod || '').trim()
  let accepted = ''
  if (Array.isArray(params.acceptedPaymentMethods)) {
    accepted = params.acceptedPaymentMethods.filter(Boolean).join(', ')
  } else if (typeof params.acceptedPaymentMethods === 'string') {
    accepted = params.acceptedPaymentMethods.trim()
  }

  if (defined) {
    paymentText = terms ? `${defined} (${terms})` : defined
  } else if (terms) {
    paymentText = terms
  } else if (accepted) {
    paymentText = accepted
  } else {
    paymentText = 'A combinar'
  }

  // 2. Financiamento
  let financingText = (params.financingTerms || '').trim()
  if (!financingText) {
    // Verificar se no accepted_payment_methods fala sobre financiamento
    if (accepted && /financi|banco|parcela|meses/i.test(accepted)) {
      financingText = accepted
    } else {
      financingText = 'Até 84 meses (sob análise bancária)'
    }
  }

  // 3. Validade
  let validityText = '-'
  if (
    params.validityDays !== undefined &&
    params.validityDays !== null &&
    params.validityDays !== ''
  ) {
    const s = String(params.validityDays).trim()
    validityText = /dias?/i.test(s) ? s : `${s} dias`
  } else {
    validityText = '15 dias'
  }

  // 4. Prazo de entrega / instalação
  let leadTimeText = (params.installationLeadTime || '').trim()
  if (!leadTimeText) {
    leadTimeText = 'Até 45 dias úteis'
  } else if (/^\d+$/.test(leadTimeText)) {
    leadTimeText = `Até ${leadTimeText} dias úteis`
  }

  // 5. Garantias
  const modW = formatWarrantyYears(params.moduleWarranty, '25 anos')
  const invW = formatWarrantyYears(params.inverterWarranty, '10 anos')
  const workW = formatWarrantyYears(params.workmanshipWarranty, '5 anos')
  const warrantiesText = `Painéis ${modW} · Inversor ${invW} · Instalação ${workW}`

  return [
    { item: 'Pagamento', condicao: paymentText },
    { item: 'Financiamento', condicao: financingText },
    { item: 'Validade', condicao: validityText },
    { item: 'Prazo de entrega', condicao: leadTimeText },
    { item: 'Garantias', condicao: warrantiesText },
  ]
}

export interface YearlySavingsRow {
  year: number
  calendarYear?: number
  generationKwh: number
  generation_kwh?: number
  consumptionKwh: number
  effectiveTariff: number
  fioBRate: number
  fioBPercent: number
  costWithoutSolar: number
  costWithSolar: number
  annualSavings: number
  cumulativeSavings: number
  balanceWithInvestment: number
  energyCreditsBalanceKwh?: number
  cumulativeDegradationPct?: number
}

export interface SavingsProjectionMilestone {
  year: number
  label: string
  annualSavings: number
  cumulativeSavings: number
}

export interface DetailedProjectionParams {
  annualSavingsYear1?: number
  annualConsumptionKwh: number
  annualGenerationYear1Kwh: number
  annualDegradationPct: number // % ex: 0.5 para 0.5% a.a.
  annualTariffAdjustmentPct: number // % ex: 5 para 5% a.a.
  simultaneityFactor: number // % ex: 30
  tariffDetails: {
    te: number
    tusd: number
    icms_rate: number
    icms_exemption: string
    fio_b_value: number
  }
  publicLightingFeeMonthly?: number
  totalInvestment?: number
  years?: number
  startYear?: number
}

/**
 * 6b. Motor de Projeção Financeira de 25 Anos (Onda 3)
 *
 * Princípios definidos pelo usuário:
 * 1. Análise ESTÁTICA / Comercial: SEM correção a valor presente (sem VPN/VPL/desconto futuro).
 * 2. Geração constante para fins de retorno do investimento (ROI simplificado). A degradação física
 *    do módulo é exibida como coluna meramente informativa, sem abater a geração no cálculo financeiro.
 * 3. Tarifa reajustada ano a ano pelo percentual EDITÁVEL (composto):
 *    Tarifa(ano N) = Tarifa(ano 1) × (1 + reajuste)^(N - 1).
 * 4. Fio B escalonado pela cronologia da Lei 14.300 sobre o valor cadastrado na concessionária:
 *    2025: 60%, 2026: 60%, 2027: 75%, 2028: 90%, 2029 em diante: 100%.
 * 5. Simultaneidade: consumo instantâneo abate da geração no mês/ano sem incidência de rede.
 * 6. Créditos acumulados de energia: excedentes transitam entre anos conforme regra de compensação da UC.
 */
export function calculateDetailed25YearsProjection(
  params: DetailedProjectionParams,
): YearlySavingsRow[] {
  const years = params.years || 25
  const currentCalendarYear = params.startYear || new Date().getFullYear()
  const inv = Number(params.totalInvestment) || 0

  const degradationRate = Math.max(0, Number(params.annualDegradationPct) || 0) / 100
  const tariffAdjustmentRate = Math.max(0, Number(params.annualTariffAdjustmentPct) || 0) / 100
  const simultaneityRatio = Math.max(0, Math.min(100, Number(params.simultaneityFactor) || 0)) / 100
  const annualConsumption = Math.max(0, Number(params.annualConsumptionKwh) || 0)
  const monthlyPublicLighting = Number(params.publicLightingFeeMonthly) || 0
  const annualPublicLighting = monthlyPublicLighting * 12

  const td = params.tariffDetails || {
    te: 0,
    tusd: 0,
    icms_rate: 0,
    icms_exemption: 'none',
    fio_b_value: 0.22,
  }
  const baseTE = Number(td.te) || 0
  const baseTUSD = Number(td.tusd) || 0
  const baseRate = baseTE + baseTUSD
  const icmsFactor = (Number(td.icms_rate) || 0) / 100
  const isTEExempt = td.icms_exemption === 'te' || td.icms_exemption === 'both'
  const isTUSDExempt = td.icms_exemption === 'tusd' || td.icms_exemption === 'both'
  const baseFioBValue = Number(td.fio_b_value) || 0.22

  const rows: YearlySavingsRow[] = []
  let cumulativeSavings = 0
  let energyCreditsBalance = 0 // Saldo acumulado na UC (kWh)

  for (let y = 1; y <= years; y++) {
    const calendarYear = currentCalendarYear + (y - 1)

    // 1. Degradação acumulada e geração anual com degradação aplicada (Ano 1 = 100% de geração, Ano N = Geração Ano 1 * (1 - d)^(N-1))
    const degradationFactor = Math.pow(1 - degradationRate, y - 1)
    const cumulativeDegradationPct = Number(((1 - degradationFactor) * 100).toFixed(1))
    const yearGeneration = Number((params.annualGenerationYear1Kwh * degradationFactor).toFixed(1))

    // 2. Reajuste anual composto da tarifa de energia
    const tariffFactor = Math.pow(1 + tariffAdjustmentRate, y - 1)
    const yearBaseRate = baseRate * tariffFactor
    const yearTE = baseTE * tariffFactor
    const yearTUSD = baseTUSD * tariffFactor
    const yearFioBBase = baseFioBValue * tariffFactor

    // 3. Fio B da Lei 14.300 por ano civil (cronologia definitiva):
    // 2025: 60%, 2026: 60%, 2027: 75%, 2028: 90%, 2029+: 100%
    let fioBPercent = 1.0
    if (calendarYear <= 2026) fioBPercent = 0.6
    else if (calendarYear === 2027) fioBPercent = 0.75
    else if (calendarYear === 2028) fioBPercent = 0.9
    else fioBPercent = 1.0

    const effectiveFioBRate = yearFioBBase * fioBPercent

    // 4. Balanço de energia partindo da GERAÇÃO:
    // a) Autoconsumo simultâneo (abate direto na geração sem passar pela rede)
    const instantConsumption = Math.min(annualConsumption, yearGeneration) * simultaneityRatio
    // b) Injeção excedente gerada enviada à rede
    const netInjected = Math.max(0, yearGeneration - instantConsumption)
    // c) Consumo que precisa ser suprido pela rede
    const remainingConsumption = Math.max(0, annualConsumption - instantConsumption)
    // d) Energia total disponível para compensação = injeção do ano + créditos acumulados na UC
    const totalAvailableToCompensate = netInjected + energyCreditsBalance
    // e) Energia compensada no ano
    const compensatedConsumption = Math.min(remainingConsumption, totalAvailableToCompensate)
    // f) Novo saldo de créditos que transita para o ano seguinte
    energyCreditsBalance = Math.max(0, totalAvailableToCompensate - compensatedConsumption)
    // g) Energia residual faturada da rede integralmente
    const energyFromGrid = Math.max(0, remainingConsumption - compensatedConsumption)

    // 5. Custos da conta com e sem solar:
    // Conta sem solar (fatura de referência no ano N com reajuste da tarifa)
    const costWithoutSolar = annualConsumption * yearBaseRate + annualPublicLighting

    // Componentes de ICMS sobre a energia compensada
    const teComponent = isTEExempt ? 0 : yearTE * icmsFactor
    const tusdComponent = isTUSDExempt ? 0 : yearTUSD * icmsFactor
    const compensatedCost = compensatedConsumption * (teComponent + tusdComponent)
    // Custo de Fio B sobre a energia compensada
    const fioBCost = compensatedConsumption * effectiveFioBRate
    // Custo de energia comprada da rede
    const gridEnergyCost = energyFromGrid * yearBaseRate

    const costWithSolar = compensatedCost + fioBCost + gridEnergyCost + annualPublicLighting

    // Economia anual no ano N
    const annualSavings = Math.max(0, costWithoutSolar - costWithSolar)
    cumulativeSavings += annualSavings

    rows.push({
      year: y,
      calendarYear,
      generationKwh: yearGeneration,
      generation_kwh: yearGeneration,
      consumptionKwh: annualConsumption,
      effectiveTariff: Number(yearBaseRate.toFixed(4)),
      fioBRate: Number(effectiveFioBRate.toFixed(4)),
      fioBPercent: Number((fioBPercent * 100).toFixed(0)),
      costWithoutSolar: Number(costWithoutSolar.toFixed(2)),
      costWithSolar: Number(costWithSolar.toFixed(2)),
      annualSavings: Number(annualSavings.toFixed(2)),
      cumulativeSavings: Number(cumulativeSavings.toFixed(2)),
      balanceWithInvestment: Number((cumulativeSavings - inv).toFixed(2)),
      energyCreditsBalanceKwh: Number(energyCreditsBalance.toFixed(1)),
      cumulativeDegradationPct,
    })
  }

  return rows
}

/**
 * 6b. Gera a tabela financeira ano a ano (Ano 1 até Ano 25)
 * Suporta assinatura simplificada (retrocompatível) e detalhada com degradação/reajuste.
 */
export function calculateYearlySavingsTable(
  annualSavingsOrParams: number | DetailedProjectionParams,
  totalInvestment: number = 0,
  years: number = 25,
): YearlySavingsRow[] {
  if (typeof annualSavingsOrParams === 'object' && annualSavingsOrParams !== null) {
    return calculateDetailed25YearsProjection(annualSavingsOrParams)
  }

  const ann = Number(annualSavingsOrParams) || 0
  const inv = Number(totalInvestment) || 0
  const rows: YearlySavingsRow[] = []

  let accumulated = 0
  for (let y = 1; y <= years; y++) {
    accumulated += ann
    rows.push({
      year: y,
      generationKwh: 0,
      generation_kwh: 0,
      consumptionKwh: 0,
      effectiveTariff: 0,
      fioBRate: 0,
      fioBPercent: 100,
      costWithoutSolar: Number(ann.toFixed(2)),
      costWithSolar: 0,
      annualSavings: Number(ann.toFixed(2)),
      cumulativeSavings: Number(accumulated.toFixed(2)),
      balanceWithInvestment: Number((accumulated - inv).toFixed(2)),
      cumulativeDegradationPct: 0,
    })
  }
  return rows
}

/**
 * 6c. Array savings_projection com os 6 marcos oficiais (Anos 1, 5, 10, 15, 20 e 25)
 * Utilizado diretamente pelos templates do Gerador (ex: Template 2).
 */
/**
 * 6c. Array savings_projection com marcos oficiais
 * Suporta cálculo a partir de YearlySavingsRow[] ou valor anual simples (retrocompatível).
 */
export function generateSavingsProjection(
  annualSavingsOrTable: number | YearlySavingsRow[],
  milestones: number[] = [1, 5, 10, 15, 20, 25],
): SavingsProjectionMilestone[] {
  if (Array.isArray(annualSavingsOrTable)) {
    return milestones.map((mYear) => {
      const row = annualSavingsOrTable.find((r) => r.year === mYear)
      return {
        year: mYear,
        label: `Ano ${mYear}`,
        annualSavings: row ? row.annualSavings : 0,
        cumulativeSavings: row ? row.cumulativeSavings : 0,
      }
    })
  }

  const ann = Number(annualSavingsOrTable) || 0
  return milestones.map((year) => ({
    year,
    label: `Ano ${year}`,
    annualSavings: Number(ann.toFixed(2)),
    cumulativeSavings: Number((ann * year).toFixed(2)),
  }))
}

/**
 * 7. Extração robusta de dias de validade (NÚMERO DE DIAS, ex: 15)
 * NUNCA retorna data por extenso.
 *
 * Estratégia:
 * 1. Se o valor for puramente numérico (ex: 15, "15", "10 dias"), extrai o número de dias.
 * 2. Se for uma data ISO/BR (ex: "2026-09-25" ou "25/09/2026"), calcula a diferença em dias
 *    relativa à referenceDate (emissão da proposta).
 * 3. Fallback sensato: 10 dias.
 */
export function extractValidityDays(
  rawValidity: any,
  referenceDate?: Date | string | null,
  fallbackDays: number = 10,
): number {
  if (rawValidity === undefined || rawValidity === null || rawValidity === '') {
    return fallbackDays
  }

  // Se já for número
  if (typeof rawValidity === 'number' && Number.isFinite(rawValidity) && rawValidity > 0) {
    return Math.round(rawValidity)
  }

  const str = String(rawValidity).trim()

  // Se contiver padrão de dias explícito: "15 dias", "10 d", "30"
  const matchNum = str.match(/^(\d+)\s*(?:dias?|d)?$/i)
  if (matchNum) {
    const n = parseInt(matchNum[1], 10)
    if (n > 0) return n
  }

  // Se contiver formato de data ISO "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm:ss"
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const targetDate = new Date(str)
    const baseDate = referenceDate ? new Date(referenceDate) : new Date()
    if (!isNaN(targetDate.getTime()) && !isNaN(baseDate.getTime())) {
      const diffMs = targetDate.getTime() - baseDate.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays > 0) return diffDays
    }
  }

  // Se contiver formato de data PT-BR "DD/MM/AAAA"
  const brMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (brMatch) {
    const d = parseInt(brMatch[1], 10)
    const m = parseInt(brMatch[2], 10) - 1
    const y = parseInt(brMatch[3], 10)
    const targetDate = new Date(y, m, d)
    const baseDate = referenceDate ? new Date(referenceDate) : new Date()
    if (!isNaN(targetDate.getTime()) && !isNaN(baseDate.getTime())) {
      const diffMs = targetDate.getTime() - baseDate.getTime()
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
      if (diffDays > 0) return diffDays
    }
  }

  // Tenta extrair qualquer dígito isolado
  const anyNumMatch = str.match(/(\d+)/)
  if (anyNumMatch) {
    const candidate = parseInt(anyNumMatch[1], 10)
    // Se parecer um número de dias plausível (ex: 1 a 365)
    if (candidate > 0 && candidate <= 365) {
      return candidate
    }
  }

  return fallbackDays
}

/**
 * 8. Formatação de data em padrão PT-BR (dd/mm/aaaa)
 */
export function formatProposalDate(dateInput?: Date | string | null): string {
  const d = dateInput ? new Date(dateInput) : new Date()
  if (isNaN(d.getTime())) {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    return `${day}/${month}/${year}`
  }
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/**
 * 9. Extração robusta da geração mensal estimada (kWh)
 * Hierarquia de fallbacks documentada no diagnóstico:
 *   1. Campo direto: sizing.estimated_monthly_generation, sizing.monthly_generation, sizing.generation_kwh
 *   2. Média aritmética dos meses individuais (jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec)
 *   3. Potência do kit x HSP média anual x 30 dias x (1 - perdas)
 */
export function extractEstimatedMonthlyGeneration(
  sizingData: any,
  kitPowerKwp?: number,
  hspAverage?: number,
): number {
  if (!sizingData || typeof sizingData !== 'object') {
    if (kitPowerKwp && kitPowerKwp > 0 && hspAverage && hspAverage > 0) {
      return Number((kitPowerKwp * hspAverage * 30 * 0.8).toFixed(1))
    }
    return 0
  }

  // 1. Campo direto
  const direct = Number(
    sizingData.estimated_monthly_generation ??
      sizingData.monthly_generation ??
      sizingData.generation_kwh ??
      0,
  )
  if (direct > 0) {
    return Number(direct.toFixed(1))
  }

  // 2. Média dos 12 meses individuais
  const months = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ]
  let monthSum = 0
  let monthCount = 0
  for (const m of months) {
    const val = Number(sizingData[m])
    if (!isNaN(val) && val > 0) {
      monthSum += val
      monthCount++
    }
  }

  if (monthCount === 12) {
    return Number((monthSum / 12).toFixed(1))
  } else if (monthCount > 0) {
    return Number((monthSum / monthCount).toFixed(1))
  }

  // 3. Fallback via potência x HSP x 30 dias x fator de performance (ex: 80% = perdas nominais típicas)
  const power = Number(kitPowerKwp || sizingData.kit_power_kwp || sizingData.power_kwp || 0)
  const hsp = Number(hspAverage || sizingData.hsp || sizingData.annual_avg_hsp || 4.5)
  if (power > 0 && hsp > 0) {
    const nominalLoss = Number(sizingData.additional_losses ?? -20)
    const efficiency = 1 - Math.abs(nominalLoss) / 100
    const est = power * hsp * 30 * (efficiency > 0.5 ? efficiency : 0.8)
    return Number(est.toFixed(1))
  }

  return 0
}

/**
 * Normaliza strings ou números de tensão para dígitos limpos (ex: "220V" -> "220", 254 -> "254").
 */
export function normalizeVoltageValue(val: any): string {
  if (val === undefined || val === null) return ''
  const s = String(val).trim()
  const m = s.match(/\d+/)
  return m ? m[0] : ''
}

/**
 * Extrai a lista de tensões nominais aceitas por um inversor fotovoltaico.
 * Trata tanto array `voltages: ['220', '254']` quanto campos legados `voltage: '220V, 254V'` ou `[220;254]`.
 */
export function extractInverterVoltages(inv: any): string[] {
  if (!inv) return []

  const set = new Set<string>()

  // Array nativo moderno
  if (Array.isArray(inv.voltages)) {
    inv.voltages.forEach((v: any) => {
      const clean = normalizeVoltageValue(v)
      if (clean) set.add(clean)
    })
  }

  // Campo string legado (ex: "220V", "127V / 220V", "[220;254]", "220, 380")
  if (inv.voltage) {
    const matches = String(inv.voltage).match(/\d+/g) || []
    matches.forEach((m) => {
      if (m) set.add(m)
    })
  }

  return Array.from(set)
}

export interface VoltageCompatibilityResult {
  isCompatible: boolean
  matchedVoltage: string | null // ex: '254'
  matchedVia: 'fase' | 'linha' | null // 'fase' ou 'linha'
  summaryText: string // ex: "Compatível via 254V (tensão de linha)" ou "Incompatível com a rede (127V / 254V)"
  gridPhase: string
  gridLine: string
  inverterVoltages: string[]
}

/**
 * Onda 4 - Regra 5: Matemática do Match de Tensão (Rede da Concessionária x Inversor)
 *
 * A rede da concessionária define Tensão de Fase e Tensão de Linha (ex.: Copel Monofásico Rural = 127V fase / 254V linha).
 * O inversor possui lista de tensões nominais aceitas (ex.: ['220', '254'] ou [220;254]).
 *
 * Um inversor é COMPATÍVEL quando sua lista contém a tensão de fase OU a tensão de linha da rede.
 * Inversores incompatíveis não são escondidos na tela, mas recebem badge e aviso claro com a justificativa técnica.
 */
export function checkInverterVoltageCompatibility(
  inverter: any,
  grid: {
    phaseVoltage?: string | number | null
    lineVoltage?: string | number | null
    tension?: string | null // fallback textual ex "127V / 254V" ou "220V"
  },
): VoltageCompatibilityResult {
  const invVoltages = extractInverterVoltages(inverter)

  let phase = normalizeVoltageValue(grid.phaseVoltage)
  let line = normalizeVoltageValue(grid.lineVoltage)

  // Se não foi passado phase/line direto, tenta extrair do campo composto tension (ex: "127V / 220V")
  if (!phase && !line && grid.tension) {
    const digits = String(grid.tension).match(/\d+/g) || []
    if (digits.length >= 2) {
      phase = digits[0]
      line = digits[1]
    } else if (digits.length === 1) {
      line = digits[0]
    }
  }

  // Se a rede não tem tensões conhecidas/definidas na negociação
  if (!phase && !line) {
    return {
      isCompatible: true,
      matchedVoltage: null,
      matchedVia: null,
      summaryText: 'Tensão da rede não informada na negociação',
      gridPhase: '',
      gridLine: '',
      inverterVoltages: invVoltages,
    }
  }

  // Se o inversor não tem tensões cadastradas
  if (invVoltages.length === 0) {
    return {
      isCompatible: true,
      matchedVoltage: null,
      matchedVia: null,
      summaryText: 'Inversor sem tensões cadastradas',
      gridPhase: phase,
      gridLine: line,
      inverterVoltages: [],
    }
  }

  // Testar match: fase tem prioridade se casar, ou linha
  let matchedVoltage: string | null = null
  let matchedVia: 'fase' | 'linha' | null = null

  if (phase && invVoltages.includes(phase)) {
    matchedVoltage = phase
    matchedVia = 'fase'
  } else if (line && invVoltages.includes(line)) {
    matchedVoltage = line
    matchedVia = 'linha'
  }

  const isCompatible = matchedVoltage !== null

  let summaryText = ''
  const gridDesc = [phase ? `${phase}V fase` : '', line ? `${line}V linha` : '']
    .filter(Boolean)
    .join(' / ')

  if (isCompatible) {
    summaryText = `Compatível via ${matchedVoltage}V (${matchedVia === 'fase' ? 'tensão de fase' : 'tensão de linha'})`
  } else {
    const invDesc = invVoltages.map((v) => `${v}V`).join(', ') || 'N/D'
    summaryText = `Incompatível com a rede (${gridDesc || 'definida'}). Inversor opera em: ${invDesc}`
  }

  return {
    isCompatible,
    matchedVoltage,
    matchedVia,
    summaryText,
    gridPhase: phase,
    gridLine: line,
    inverterVoltages: invVoltages,
  }
}

export interface ImmediateSizingRecommendation {
  recommendedModules: number
  systemPowerKwp: number
  requiredKwp: number
  avgConsumption: number
  dailyTargetKwh: number
  hspAverage: number
  totalLossFactor: number
  totalLossesPct: number
  generationList: Array<{
    moduleId: string
    moduleName: string
    modulePowerW: number
    quantity: number
    powerKwp: number
  }>
}

/**
 * Onda 4 - Regra 1 e 3: Recomendação Imediata ao Selecionar Módulo
 *
 * O consultor escolhe o módulo e o sistema calcula imediatamente:
 * - Quantos módulos são necessários para cobrir o consumo alvo
 * - Potência do sistema em kWp
 * - Estruturado com lista de gerações (generationList) para o motor suportar múltiplos
 *   no futuro sem quebrar a regra de 1 modelo de módulo na UI.
 */
export function calculateImmediateModuleRecommendation(params: {
  module: { id: string; name?: string; brand?: string; power?: number } | null
  avgConsumptionKwh: number
  hspAverage?: number
  nominalLossesPct?: number // padrão 23%
  additionalLossesPct?: number // padrão 0%
}): ImmediateSizingRecommendation {
  const avgConsumption = Math.max(0, Number(params.avgConsumptionKwh) || 0)
  const hsp = Number(params.hspAverage) > 0 ? Number(params.hspAverage) : 4.94
  const nomLoss = Number(params.nominalLossesPct ?? 23)
  const addLoss = Number(params.additionalLossesPct || 0)
  const totalLossesPct = Math.max(0, Math.min(99, nomLoss + addLoss))
  const totalLossFactor = 1 - totalLossesPct / 100

  const avgDaysPerMonth = 365 / 12
  const dailyTargetKwh = avgConsumption > 0 ? avgConsumption / avgDaysPerMonth : 0
  const avgDailyGenPerKwp = hsp * totalLossFactor
  const requiredKwp =
    avgDailyGenPerKwp > 0 && dailyTargetKwh > 0 ? dailyTargetKwh / avgDailyGenPerKwp : 0

  const mod = params.module
  const modPowerW = mod ? Number(mod.power) || 0 : 0

  let recommendedModules = 0
  if (modPowerW > 0 && requiredKwp > 0) {
    recommendedModules = Math.ceil((requiredKwp * 1000) / modPowerW)
  }

  const systemPowerKwp =
    modPowerW > 0 && recommendedModules > 0 ? (recommendedModules * modPowerW) / 1000 : 0

  const modName = mod
    ? [mod.brand, mod.name].filter(Boolean).join(' ') || `Módulo ${modPowerW}W`
    : 'Módulo'

  // Motor preservado com LISTA de gerações (Onda 4, item 3)
  const generationList: ImmediateSizingRecommendation['generationList'] =
    mod && recommendedModules > 0
      ? [
          {
            moduleId: mod.id,
            moduleName: modName,
            modulePowerW: modPowerW,
            quantity: recommendedModules,
            powerKwp: Number(systemPowerKwp.toFixed(3)),
          },
        ]
      : []

  return {
    recommendedModules,
    systemPowerKwp: Number(systemPowerKwp.toFixed(2)),
    requiredKwp: Number(requiredKwp.toFixed(2)),
    avgConsumption,
    dailyTargetKwh: Number(dailyTargetKwh.toFixed(2)),
    hspAverage: Number(hsp.toFixed(2)),
    totalLossFactor: Number(totalLossFactor.toFixed(4)),
    totalLossesPct,
    generationList,
  }
}

export interface InverterMatchSummary {
  totalDcPowerKwp: number // Potência dos módulos CC
  totalAcPowerKw: number // Potência nominal total dos inversores CA
  ratioPct: number // Overload / Carregamento = (totalDcPowerKwp / totalAcPowerKw) * 100
  overloadStatus: 'ideal' | 'moderado' | 'alto' | 'baixo' | 'sem_inversor'
  statusLabel: string
  statusColorClass: string
}

/**
 * Onda 4 - Regra 4: "Colinha da Potência CC / CA" e Overload
 *
 * Calcula a relação CC / CA entre a potência dos módulos e a potência dos inversores,
 * retornando a proporção exata e o diagnóstico para o consultor de vendas.
 */
export function calculateInverterMatchSummary(
  totalDcPowerKwp: number,
  selectedInverters: Array<{ power?: number; qty?: number; quantity?: number }>,
): InverterMatchSummary {
  const dcKwp = Math.max(0, Number(totalDcPowerKwp) || 0)
  const acKw = (selectedInverters || []).reduce((acc, inv) => {
    const p = Number(inv.power) || 0
    const q = Number(inv.qty || inv.quantity || 0)
    return acc + p * q
  }, 0)

  if (acKw <= 0) {
    return {
      totalDcPowerKwp: Number(dcKwp.toFixed(2)),
      totalAcPowerKw: 0,
      ratioPct: 0,
      overloadStatus: 'sem_inversor',
      statusLabel: 'Nenhum inversor selecionado',
      statusColorClass: 'text-muted-foreground',
    }
  }

  const ratioPct = Number(((dcKwp / acKw) * 100).toFixed(1))

  let overloadStatus: InverterMatchSummary['overloadStatus'] = 'ideal'
  let statusLabel = 'Equilibrado'
  let statusColorClass = 'text-emerald-600 dark:text-emerald-400'

  if (ratioPct < 90) {
    overloadStatus = 'baixo'
    statusLabel = 'Subdimensionado (potência CA sobra)'
    statusColorClass = 'text-amber-600 dark:text-amber-400'
  } else if (ratioPct >= 90 && ratioPct <= 135) {
    overloadStatus = 'ideal'
    statusLabel = 'Excelente (relação CC/CA recomendada)'
    statusColorClass = 'text-emerald-600 dark:text-emerald-400'
  } else if (ratioPct > 135 && ratioPct <= 150) {
    overloadStatus = 'moderado'
    statusLabel = 'Atenção: Overload elevado'
    statusColorClass = 'text-amber-600 dark:text-amber-400'
  } else {
    overloadStatus = 'alto'
    statusLabel = 'Crítico: Overload acima de 150%'
    statusColorClass = 'text-rose-600 dark:text-rose-400'
  }

  return {
    totalDcPowerKwp: Number(dcKwp.toFixed(2)),
    totalAcPowerKw: Number(acKw.toFixed(2)),
    ratioPct,
    overloadStatus,
    statusLabel,
    statusColorClass,
  }
}

export const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export const HSP_MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]

export interface RoofFaceItem {
  orientation: string
  modules: number | string
}

export interface OrientationLossRule {
  orientation: string
  loss: number | string
}

export interface MonthlyGenerationItem {
  month: string
  geracao: number
}

export interface SystemGenerationResult {
  monthlyGeneration: MonthlyGenerationItem[]
  estMonthlyGen: number
  annualGenerationKwh: number
}

/**
 * Cálculo robusto da geração solar mês a mês e média mensal considerando:
 * - Divisão por faces do telhado (se useRoofFaces = true e houver faces cadastradas)
 * - Eficiência/perda cadastrada por face (da regra de eficiência PV da companhia)
 * - Perdas globais (nominais + adicionais opcionais)
 * - HSP mensal ou HSP anual médio do município
 *
 * Fórmula por face / mês:
 *   facePowerKwp = (modulesOnFace * modulePowerW) / 1000
 *   faceLossFactor = (1 - totalLossesNum / 100) * (1 - orientLoss / 100)
 *   faceGenMonth = hspMonth * facePowerKwp * faceLossFactor * daysInMonth
 *
 * Fórmula sem faces / mês:
 *   kitPowerKwp = (totalModules * modulePowerW) / 1000
 *   genMonth = hspMonth * kitPowerKwp * (1 - totalLossesNum / 100) * daysInMonth
 */
export function calculateSystemMonthlyGeneration(params: {
  modulePowerW: number
  totalModuleQty?: number
  useRoofFaces?: boolean
  roofFaces?: RoofFaceItem[]
  orientationLossRules?: OrientationLossRule[]
  nominalLossesPct?: number // padrão 23%
  additionalLossesPct?: number // padrão 0%
  hspData?: any // registro com jan, feb, ..., dec e annual_avg
  fallbackHsp?: number // padrão 4.94
}): SystemGenerationResult {
  const modPowerW = Math.max(0, Number(params.modulePowerW) || 0)
  const nomLoss = Number(params.nominalLossesPct ?? 23)
  const addLoss = Number(params.additionalLossesPct || 0)
  const totalLossesPct = Math.max(0, Math.min(99, nomLoss + addLoss))
  const globalLossFactor = 1 - totalLossesPct / 100

  const hspNum = Number(params.hspData?.annual_avg || params.fallbackHsp || 4.94)
  const hspData = params.hspData || null

  const useFaces = Boolean(params.useRoofFaces)
  const rawFaces = params.roofFaces || []
  const rules = params.orientationLossRules || []

  // Normalização do dicionário de perdas por orientação (case-insensitive)
  const orientationLossMap = new Map<string, number>()
  for (const r of rules) {
    if (r && r.orientation) {
      orientationLossMap.set(String(r.orientation).trim().toLowerCase(), Number(r.loss) || 0)
    }
  }

  // Se usar faces, filtrar apenas faces com módulos > 0
  const validFaces = useFaces
    ? rawFaces
        .map((f) => ({
          orientation: String(f.orientation || '').trim(),
          modules: Number(f.modules) || 0,
        }))
        .filter((f) => f.modules > 0 && f.orientation.length > 0)
    : []

  const hasActiveFaces = useFaces && validFaces.length > 0

  // Se não usar faces ativas, usa quantidade total de módulos
  const effectiveTotalQty = hasActiveFaces
    ? validFaces.reduce((acc, f) => acc + f.modules, 0)
    : Math.max(0, Number(params.totalModuleQty) || 0)

  const totalKitPowerKwp = (effectiveTotalQty * modPowerW) / 1000

  const monthlyGeneration: MonthlyGenerationItem[] = MONTH_LABELS.map((month, idx) => {
    const days = DAYS_IN_MONTH[idx]
    const monthKey = HSP_MONTH_KEYS[idx]
    const hspMonth =
      hspData && typeof hspData[monthKey] === 'number' && hspData[monthKey] > 0
        ? Number(hspData[monthKey])
        : hspNum

    let monthGen = 0

    if (hasActiveFaces) {
      for (const face of validFaces) {
        const facePowerKwp = (face.modules * modPowerW) / 1000
        const orientLoss = orientationLossMap.get(face.orientation.toLowerCase()) ?? 0
        const faceOrientLossFactor = 1 - Math.max(0, Math.min(99, orientLoss)) / 100
        // Perda combinada: (1 - perda_global) * (1 - perda_face)
        const faceLossFactor = globalLossFactor * faceOrientLossFactor
        monthGen += hspMonth * facePowerKwp * faceLossFactor * days
      }
    } else {
      monthGen = hspMonth * totalKitPowerKwp * globalLossFactor * days
    }

    return {
      month,
      geracao: Math.round(monthGen),
    }
  })

  const annualGenerationKwh = monthlyGeneration.reduce((acc, curr) => acc + curr.geracao, 0)
  const estMonthlyGen = Math.round(annualGenerationKwh / 12)

  return {
    monthlyGeneration,
    estMonthlyGen,
    annualGenerationKwh,
  }
}
