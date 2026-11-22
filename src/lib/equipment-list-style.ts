/**
 * Filtra a lista de equipamentos enviada ao Gerador de Propostas conforme
 * pricing.equipment_list_style da proposal_settings da companhia:
 * - "compact": apenas módulos e inversores (Resumida)
 * - "full": todos os itens (Completa)
 * - "generic": módulos + inversores + item genérico (Agrupada)
 *
 * Fallback seguro: estilo "none" (opção "Não enviar lista", removida do
 * seletor) ou qualquer valor desconhecido é interpretado como "full" — sem
 * migração de dados.
 *
 * Mesma semântica do hook pocketbase/hooks/proposals_create_generator.js
 * (formatEquipmentsByStyle). NÃO altera o motor de cálculo — apenas a lista
 * que vai no payload ao Gerador.
 */

export interface EquipmentEntryLike {
  item?: string
  specification?: string
  quantity?: string | number
  warranty?: string
  [key: string]: any
}

export interface EquipmentListStyleResult {
  list: EquipmentEntryLike[]
  omit: boolean
}

const normKey = (v: any) =>
  String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

const GENERIC_MODULE_ITEM = 'modulo fotovoltaico'
const GENERIC_MODULE_SPEC = 'alta eficiencia'
const GENERIC_INVERTER_ITEM = 'inversor solar'
const GENERIC_INVERTER_SPEC = 'inversor de conexao a rede'

export function applyEquipmentListStyle(
  list: EquipmentEntryLike[],
  style: string | null | undefined,
  module?: any,
  inverters?: any[],
): EquipmentListStyleResult {
  // Fallback seguro: "none" (opção removida do seletor) ou valor desconhecido
  // é interpretado como "full" — companhia existente não quebra, sem migração.
  const normalized = style === 'compact' || style === 'generic' ? style : 'full'

  // Núcleo real do kit: módulo + inversores (do catálogo/snapshot)
  const coreKeys = new Set<string>()
  const pushKeys = (rec: any) => {
    if (!rec) return
    const name = normKey(rec.name)
    const brand = normKey(rec.brand)
    if (name) coreKeys.add(name)
    if (brand) coreKeys.add(brand)
    if (brand && name && name.indexOf(brand) === -1) coreKeys.add(brand + ' ' + name)
  }
  pushKeys(module)
  for (const inv of inverters || []) pushKeys(inv)

  const isCore = (e: EquipmentEntryLike) => {
    const nItem = normKey(e.item)
    const nSpec = normKey(e.specification)
    if (nItem === GENERIC_MODULE_ITEM || nSpec === GENERIC_MODULE_SPEC) return true
    if (nItem === GENERIC_INVERTER_ITEM || nSpec === GENERIC_INVERTER_SPEC) return true
    let isCoreHit = false
    coreKeys.forEach((key) => {
      if (nItem === key || nSpec === key || nItem.indexOf(key) !== -1) isCoreHit = true
    })
    return isCoreHit
  }

  const withoutInstalledPower = list.filter((e) => normKey(e.item) !== 'potencia instalada')

  if (normalized === 'compact') {
    return { list: withoutInstalledPower.filter((e) => isCore(e)), omit: false }
  }

  if (normalized === 'generic') {
    const res = withoutInstalledPower.filter((e) => isCore(e))
    res.push({
      item: 'Proteção e materiais complementares',
      specification: 'Incluso na proposta',
      quantity: '1 conjunto',
      warranty: 'Conforme fabricante',
    })
    return { list: res, omit: false }
  }

  // "full" (default): mantém todos os itens
  return { list: withoutInstalledPower, omit: false }
}
