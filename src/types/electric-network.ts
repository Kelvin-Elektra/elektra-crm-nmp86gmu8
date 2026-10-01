export const NOMINAL_VOLTAGES = ['127', '220', '254', '380', '440'] as const
export type NominalVoltage = (typeof NOMINAL_VOLTAGES)[number]

export const NETWORK_TYPES = [
  'Monofásico',
  'Bifásico',
  'Trifásico',
  'Monofásico Rural',
  'Outros',
] as const
export type NetworkType = (typeof NETWORK_TYPES)[number]

export interface NetworkVoltageConfig {
  phase?: string // Tensão fase-neutro (127, 220, etc.)
  line?: string // Tensão fase-fase (220, 254, 380, 440, etc.)
}

export type UtilityNetworkVoltages = Record<string, NetworkVoltageConfig>

export const PHASE_VOLTAGE_TOOLTIP =
  'Tensão de Fase: medida entre uma fase e o condutor neutro (fase-neutro).'
export const LINE_VOLTAGE_TOOLTIP =
  'Tensão de Linha: medida entre duas fases da rede elétrica (fase-fase).'

/**
 * Normaliza a chave do tipo de rede para indexação em network_voltages
 */
export function normalizeNetworkTypeKey(type: string): string {
  const clean = (type || '').trim().toLowerCase()
  if (clean.includes('rural')) return 'Monofásico Rural'
  if (clean.startsWith('mono')) return 'Monofásico'
  if (clean.startsWith('bi')) return 'Bifásico'
  if (clean.startsWith('tri')) return 'Trifásico'
  if (clean.includes('outro')) return 'Outros'
  return type || 'Outros'
}

/**
 * Retorna as tensões padrão/configuradas para uma rede de concessionária
 */
export function getVoltagesForNetwork(
  networkVoltages: UtilityNetworkVoltages | undefined | null,
  networkType: string,
): { phase: string; line: string } {
  if (!networkVoltages || typeof networkVoltages !== 'object') {
    return { phase: '', line: '' }
  }
  const key = normalizeNetworkTypeKey(networkType)
  const cfg = networkVoltages[key] || networkVoltages[networkType]
  return {
    phase: cfg?.phase || '',
    line: cfg?.line || '',
  }
}
