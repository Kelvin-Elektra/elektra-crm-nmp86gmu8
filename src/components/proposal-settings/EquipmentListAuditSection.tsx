import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface EquipmentAuditRow {
  item: string
  specification: string
  quantity: string
  warranty: string
}

const SAMPLE_STYLES: Record<string, string> = {
  compact: 'Lista compacta (apenas módulos e inversores)',
  full: 'Lista completa de equipamentos e insumos',
  generic: 'Item genérico (proteção e materiais)',
  none: 'Sem lista de equipamentos',
}

const SAMPLE_SUPPLIES: EquipmentAuditRow[] = [
  {
    item: 'Estrutura de Fixação',
    specification: 'Material de Instalação e Proteção',
    quantity: '1 conjunto',
    warranty: '-',
  },
  {
    item: 'Cabo Solar 6mm',
    specification: 'Material de Instalação e Proteção',
    quantity: '30',
    warranty: '-',
  },
  {
    item: 'Conector MC4',
    specification: 'Material de Instalação e Proteção',
    quantity: '4',
    warranty: '-',
  },
]

// Espelha a lógica formatEquipmentsByStyle do hook proposals_create_generator.js:
// módulo + inversores sempre entram; compact corta aqui; generic adiciona UM item
// genérico; full acrescenta os insumos; none omite o campo equipments do payload.
function buildPreviewRows(style: string): EquipmentAuditRow[] {
  const core: EquipmentAuditRow[] = [
    {
      item: 'Canadian Solar Painel 550W',
      specification: '550W · Frame: Anodizado',
      quantity: '10',
      warranty: '25 anos',
    },
    {
      item: 'Growatt Inversor 5kW',
      specification: '5 kW · Monofásico',
      quantity: '1',
      warranty: '10 anos',
    },
  ]

  if (style === 'none') return []
  if (style === 'compact') return core
  if (style === 'generic') {
    return [
      ...core,
      {
        item: 'Proteção e materiais complementares',
        specification: 'Incluso na proposta',
        quantity: '1 conjunto',
        warranty: 'Conforme fabricante',
      },
    ]
  }
  // Default: "full" (ou qualquer outro valor) — igual ao fallback do hook
  return [...core, ...SAMPLE_SUPPLIES]
}

export function EquipmentListAuditSection({ equipmentListStyle }: { equipmentListStyle: string }) {
  const [expanded, setExpanded] = useState(false)
  const rows = buildPreviewRows(equipmentListStyle)
  const styleLabel = SAMPLE_STYLES[equipmentListStyle] || SAMPLE_STYLES.full

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Auditoria do payload</CardTitle>
        <CardDescription>
          Prévia de como a lista de equipamentos será enviada ao Gerador de Propostas, conforme o
          estilo atual. A lista de verdade usada para montar o kit permanece na negociação.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden bg-card">
          <button
            type="button"
            className="w-full flex items-center justify-between p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors font-semibold text-sm text-foreground text-left"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center gap-2">
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <span>Lista de equipamentos enviados ao Gerador de Propostas</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-primary/10 text-primary">
                {styleLabel}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-normal">
              {equipmentListStyle === 'none'
                ? 'campo omitido'
                : `${rows.length} ${rows.length === 1 ? 'item' : 'itens'}`}
            </span>
          </button>

          {expanded && (
            <div className="border-t p-4">
              {equipmentListStyle === 'none' ? (
                <p className="text-sm text-muted-foreground">
                  Com o estilo atual, o campo <code>equipments</code> é omitido do payload — nenhuma
                  lista de equipamentos chega ao Gerador de Propostas.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Exemplo ilustrativo com dados de um kit típico. Em uma proposta real, os itens
                    vêm do kit montado na negociação (módulo e inversores do catálogo).
                  </p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground border-b text-[11px]">
                        <th className="text-left pb-1.5 font-medium">Equipamento / Insumo</th>
                        <th className="text-left pb-1.5 font-medium">Especificação</th>
                        <th className="text-center pb-1.5 font-medium w-24">Qtd.</th>
                        <th className="text-right pb-1.5 font-medium w-32">Garantia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, idx) => (
                        <tr key={`${r.item}-${idx}`} className="border-b last:border-0">
                          <td className="py-2 text-foreground font-medium">{r.item}</td>
                          <td className="py-2 text-muted-foreground">{r.specification}</td>
                          <td className="py-2 text-center text-muted-foreground tabular-nums">
                            {r.quantity}
                          </td>
                          <td className="py-2 text-right text-muted-foreground">{r.warranty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
