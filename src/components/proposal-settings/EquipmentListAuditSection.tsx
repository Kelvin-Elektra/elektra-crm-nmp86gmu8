import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export interface EquipmentAuditRow {
  item: string
  specification: string
  quantity: string
  warranty: string
}

// Rótulos amigáveis (mesmos do seletor em ProposalSettings) — sem jargão.
// O valor salvo em equipment_list_style continua compact/full/generic;
// "none" (opção removida do seletor) é tratado como "full" no fallback.
const SAMPLE_STYLES: Record<string, string> = {
  compact: 'Resumida (apenas módulos e inversores)',
  full: 'Completa (todos os itens)',
  generic: 'Agrupada (itens por categoria)',
}

const STYLE_TOOLTIPS: Record<string, string> = {
  compact: 'Apenas módulos e inversores na lista de equipamentos',
  full: 'Todos os itens do kit, incluindo insumos',
  generic: 'Itens de proteção e materiais em um item agrupado',
}

export const SAMPLE_SUPPLIES: EquipmentAuditRow[] = [
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

export const CORE_KIT_ROWS: EquipmentAuditRow[] = [
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

const GENERIC_GROUP_ROW: EquipmentAuditRow = {
  item: 'Proteção e materiais complementares',
  specification: 'Incluso na proposta',
  quantity: '1 conjunto',
  warranty: 'Conforme fabricante',
}

// Espelha a lógica formatEquipmentsByStyle do hook proposals_create_generator.js:
// módulo + inversores sempre entram; compact corta aqui; generic adiciona UM item
// genérico; full acrescenta os insumos. "none" cai no fallback "full".
function buildPreviewRows(style: string): EquipmentAuditRow[] {
  if (style === 'compact') return CORE_KIT_ROWS
  if (style === 'generic') return [...CORE_KIT_ROWS, GENERIC_GROUP_ROW]
  // Default: "full" (ou qualquer outro valor, incluindo "none") — igual ao fallback do hook
  return [...CORE_KIT_ROWS, ...SAMPLE_SUPPLIES]
}

function AuditTable({ rows }: { rows: EquipmentAuditRow[] }) {
  return (
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
            <td className="py-2 text-center text-muted-foreground tabular-nums">{r.quantity}</td>
            <td className="py-2 text-right text-muted-foreground">{r.warranty}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function CollapsibleList({
  title,
  badge,
  tooltip,
  countLabel,
  children,
  defaultOpen,
}: {
  title: string
  badge?: string
  tooltip?: string
  countLabel: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [expanded, setExpanded] = useState(!!defaultOpen)
  return (
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
          <span>{title}</span>
          {badge && tooltip && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    tabIndex={0}
                    className="text-[11px] font-normal px-2 py-0.5 rounded bg-primary/10 text-primary cursor-help"
                  >
                    {badge}
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <span className="text-xs text-muted-foreground font-normal">{countLabel}</span>
      </button>
      {expanded && <div className="border-t p-4">{children}</div>}
    </div>
  )
}

interface Props {
  /** Estilo atual (seletor da aba Detalhes Financeiros / Template e Design) */
  equipmentListStyle: string
  /** Lista completa do kit (sem filtro) — reativa ao estilo? Não: é o kit de verdade */
  fullKitList: EquipmentAuditRow[]
}

export function EquipmentListAuditSection({ equipmentListStyle, fullKitList }: Props) {
  const sentRows = buildPreviewRows(equipmentListStyle)
  const styleLabel = SAMPLE_STYLES[equipmentListStyle] || SAMPLE_STYLES.full
  const styleTooltip = STYLE_TOOLTIPS[equipmentListStyle] || STYLE_TOOLTIPS.full

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Auditoria do payload</CardTitle>
        <CardDescription>
          Prévia de como a lista de equipamentos será enviada ao Gerador de Propostas, conforme o
          estilo atual. A lista de verdade usada para montar o kit permanece na negociação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Exemplo ilustrativo com dados de um kit típico. Em uma proposta real, os itens vêm do kit
          montado na negociação (módulo e inversores do catálogo).
        </p>

        <CollapsibleList
          title="Equipamentos do kit (lista completa)"
          countLabel={`${fullKitList.length} ${fullKitList.length === 1 ? 'item' : 'itens'}`}
          defaultOpen={false}
        >
          <AuditTable rows={fullKitList} />
        </CollapsibleList>

        <CollapsibleList
          title="Lista enviada ao Gerador de Propostas"
          badge={styleLabel}
          tooltip={styleTooltip}
          countLabel={`${sentRows.length} ${sentRows.length === 1 ? 'item' : 'itens'}`}
          defaultOpen={true}
        >
          <AuditTable rows={sentRows} />
        </CollapsibleList>
      </CardContent>
    </Card>
  )
}
