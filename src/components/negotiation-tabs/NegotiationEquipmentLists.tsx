import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { applyEquipmentListStyle } from '@/lib/equipment-list-style'
import type { EquipmentEntryLike } from '@/lib/equipment-list-style'
import { getEquipmentStyleLabel } from '@/components/proposal-settings/equipment-list-samples'
import type { EquipmentAuditRow } from '@/components/proposal-settings/equipment-list-samples'

function AuditTable({ rows }: { rows: EquipmentEntryLike[] }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Nenhum equipamento montado no kit desta negociação ainda.
      </p>
    )
  }
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
            <td className="py-2 text-muted-foreground">{r.specification || '-'}</td>
            <td className="py-2 text-center text-muted-foreground tabular-nums">{r.quantity}</td>
            <td className="py-2 text-right text-muted-foreground">{r.warranty || '-'}</td>
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
  /** Lista completa do kit da negociação (montada a partir do dimensionamento real) */
  fullKitList: EquipmentAuditRow[]
  /** Módulo e inversores do catálogo — identificam o "núcleo" do kit no filtro de estilo */
  catalogModule?: any
  catalogInverters?: any[]
  /** Estilo configurado da companhia (proposal_settings.pricing.equipment_list_style) */
  equipmentListStyle: string
}

/**
 * Duas seções recolhidas nos detalhes da proposta na negociação:
 * (a) a lista real usada para montar o kit; (b) a lista que segue ao Gerador
 * de Propostas após o estilo configurado da companhia (reativo ao vivo).
 */
export function NegotiationEquipmentLists({
  fullKitList,
  catalogModule,
  catalogInverters,
  equipmentListStyle,
}: Props) {
  const sentList = useMemo(
    () => applyEquipmentListStyle(fullKitList, equipmentListStyle, catalogModule, catalogInverters),
    [fullKitList, equipmentListStyle, catalogModule, catalogInverters],
  )

  const fullCount = `${fullKitList.length} ${fullKitList.length === 1 ? 'item' : 'itens'}`
  const sentCount = `${sentList.list.length} ${sentList.list.length === 1 ? 'item' : 'itens'}`

  return (
    <div className="space-y-3">
      <CollapsibleList
        title="Equipamentos do kit (lista completa)"
        countLabel={fullCount}
        defaultOpen={false}
      >
        <AuditTable rows={fullKitList} />
      </CollapsibleList>

      <CollapsibleList
        title="Lista enviada ao Gerador de Propostas"
        badge={getEquipmentStyleLabel(equipmentListStyle)}
        tooltip={
          sentList.list.length < fullKitList.length
            ? 'Estilo configurado na companhia: parte dos itens fica de fora da proposta.'
            : 'Estilo configurado na companhia: todos os itens do kit entram na proposta.'
        }
        countLabel={sentCount}
        defaultOpen={false}
      >
        <AuditTable rows={sentList.list} />
      </CollapsibleList>

      <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
        <FileText className="w-3 h-3 mt-0.5 shrink-0" />A segunda lista reflete o estilo configurado
        em Configurações da Proposta e é reavaliada ao vivo conforme o estilo da companhia.
      </p>
    </div>
  )
}

export default NegotiationEquipmentLists
