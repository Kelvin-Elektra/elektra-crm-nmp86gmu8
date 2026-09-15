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

export interface YearlySavingsRow {
  year: number
  annualSavings: number
  cumulativeSavings: number
  balanceWithInvestment: number
}

export interface SavingsProjectionMilestone {
  year: number
  label: string
  annualSavings: number
  cumulativeSavings: number
}

/**
 * 6b. Gera a tabela financeira ano a ano (Ano 1 até Ano 25)
 * Fonte da verdade dos cálculos de economia acumulada e retorno do investimento.
 */
export function calculateYearlySavingsTable(
  annualSavings: number,
  totalInvestment: number = 0,
  years: number = 25,
): YearlySavingsRow[] {
  const ann = Number(annualSavings) || 0
  const inv = Number(totalInvestment) || 0
  const rows: YearlySavingsRow[] = []

  let accumulated = 0
  for (let y = 1; y <= years; y++) {
    accumulated += ann
    rows.push({
      year: y,
      annualSavings: Number(ann.toFixed(2)),
      cumulativeSavings: Number(accumulated.toFixed(2)),
      balanceWithInvestment: Number((accumulated - inv).toFixed(2)),
    })
  }
  return rows
}

/**
 * 6c. Array savings_projection com os 6 marcos oficiais (Anos 1, 5, 10, 15, 20 e 25)
 * Utilizado diretamente pelos templates do Gerador (ex: Template 2).
 */
export function generateSavingsProjection(
  annualSavings: number,
  milestones: number[] = [1, 5, 10, 15, 20, 25],
): SavingsProjectionMilestone[] {
  const ann = Number(annualSavings) || 0
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
