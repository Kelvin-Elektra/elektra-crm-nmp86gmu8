import { Check, Minus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  EQUIPMENT_STYLE_OPTIONS,
  buildStyleExampleList,
} from '@/components/proposal-settings/equipment-list-samples'

/**
 * Prévia de como a lista de equipamentos ficará na proposta, para CADA estilo
 * do seletor — exemplo com itens de amostra (nada é salvo).
 */
export function EquipmentListPreviewPopover({
  value,
  onSelect,
}: {
  value: string
  onSelect: (id: string) => void
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1.5">
          Prévia dos estilos
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="px-4 py-3 border-b bg-muted/40">
          <p className="text-sm font-semibold">Prévia da lista na proposta</p>
          <p className="text-xs text-muted-foreground">
            Exemplo de como os equipamentos aparecem em cada estilo.
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {EQUIPMENT_STYLE_OPTIONS.map((opt) => {
            const rows = buildStyleExampleList(opt.id)
            const active = value === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/40 transition-colors ${
                  active ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {active && <Check className="w-3.5 h-3.5 text-primary" />}
                    {opt.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {rows.length} {rows.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {rows.map((r) => (
                    <li
                      key={r.item}
                      className="text-xs text-muted-foreground flex items-start gap-1.5"
                    >
                      <Minus className="w-3 h-3 mt-0.5 shrink-0" />
                      <span>
                        <span className="text-foreground">{r.item}</span>
                        {r.specification ? ` — ${r.specification}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default EquipmentListPreviewPopover
