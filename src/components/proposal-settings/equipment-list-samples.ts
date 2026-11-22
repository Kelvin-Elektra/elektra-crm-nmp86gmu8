export interface EquipmentAuditRow {
  item: string
  specification: string
  quantity: number | string
  warranty?: string
}

// Rótulos amigáveis por estilo — SEM jargão técnico (nada de payload/hook/schema)
export const EQUIPMENT_STYLE_OPTIONS = [
  { id: 'compact', name: 'Resumida — envia apenas módulos e inversor' },
  { id: 'full', name: 'Completa — envia todos os itens' },
  { id: 'generic', name: 'Agrupada — envia itens agrupados por categoria' },
] as const

export type EquipmentStyleId = (typeof EQUIPMENT_STYLE_OPTIONS)[number]['id']

export function getEquipmentStyleLabel(style: string): string {
  const found = EQUIPMENT_STYLE_OPTIONS.find((o) => o.id === style)
  if (found) return found.name
  // 'none' foi removido do seletor — cai no fallback 'full'
  return EQUIPMENT_STYLE_OPTIONS.find((o) => o.id === 'full')!.name
}

/** Linhas de exemplo dos itens de "núcleo" do kit (módulo + inversores) */
export const CORE_KIT_ROWS: EquipmentAuditRow[] = [
  {
    item: 'Módulo Fotovoltaico 550Wp',
    specification: 'Monocristalino, 21,3% de eficiência',
    quantity: 10,
    warranty: '12 anos',
  },
  {
    item: 'Inversor Solar 5 kW',
    specification: 'Monofásico 220V, 2 MPPTs',
    quantity: 1,
    warranty: '10 anos',
  },
]

/** Linhas de exemplo dos demais insumos do kit (estrutura, cabos etc.) */
export const SAMPLE_SUPPLIES: EquipmentAuditRow[] = [
  {
    item: 'Estrutura de Fixação',
    specification: 'Perfil para telhado de cerâmica',
    quantity: 10,
    warranty: '10 anos',
  },
  {
    item: 'Cabo Solar 6mm²',
    specification: 'Rolo com 100m, preto e vermelho',
    quantity: 1,
    warranty: '-',
  },
  {
    item: 'Conector MC4',
    specification: 'Par macho/fêmea',
    quantity: 10,
    warranty: '-',
  },
]

/** Exemplo ilustrativo de como a lista sai em cada estilo (dados fictícios) */
export function buildStyleExampleList(style: string): EquipmentAuditRow[] {
  if (style === 'compact') return CORE_KIT_ROWS
  if (style === 'generic')
    return [
      ...CORE_KIT_ROWS,
      {
        item: 'Proteção e Materiais Elétricos',
        specification: 'Disjuntores, DPS, cabos e conectores (item agrupado)',
        quantity: 1,
        warranty: '-',
      },
    ]
  return [...CORE_KIT_ROWS, ...SAMPLE_SUPPLIES]
}
