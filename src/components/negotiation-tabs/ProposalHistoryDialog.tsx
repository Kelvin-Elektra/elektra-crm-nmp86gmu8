import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { History, Eye } from 'lucide-react'
import { getProposalHistory } from '@/services/proposal-history'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function ProposalHistoryDialog({
  open,
  onOpenChange,
  proposalId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  proposalId: string
}) {
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null)

  useEffect(() => {
    if (!open || !proposalId) return
    setLoading(true)
    getProposalHistory(proposalId)
      .then((records) => setHistory(records))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [open, proposalId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" /> Histórico da Proposta
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando histórico...</div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum histórico de alterações encontrado.
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {history.map((entry, index) => {
                const snapshot = entry.snapshot_data || {}
                const isLatest = index === 0
                const changedByName = entry.expand?.changed_by?.name || 'Usuário'
                return (
                  <div
                    key={entry.id}
                    className={`border rounded-lg p-4 ${isLatest ? 'border-primary/30 bg-primary/5' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isLatest && (
                          <Badge variant="secondary" className="text-xs">
                            Versão Atual
                          </Badge>
                        )}
                        {!isLatest && (
                          <Badge variant="outline" className="text-xs">
                            v{history.length - index}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Alterado por:</span>{' '}
                        <span className="font-medium">{changedByName}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Valor:</span>{' '}
                        <span className="font-medium">
                          {BRL.format(snapshot.pricing?.salePrice || 0)}
                        </span>
                      </div>
                      {snapshot.financialProjection && (
                        <div>
                          <span className="text-muted-foreground">Geração Est.:</span>{' '}
                          <span className="font-medium">
                            {Math.round(snapshot.financialProjection.estMonthlyGen || 0)} kWh/mês
                          </span>
                        </div>
                      )}
                      {snapshot.sizing?.kit_power_kwp != null && (
                        <div>
                          <span className="text-muted-foreground">Potência:</span>{' '}
                          <span className="font-medium">
                            {Number(snapshot.sizing.kit_power_kwp).toFixed(2)} kWp
                          </span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 text-xs"
                      onClick={() =>
                        setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)
                      }
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      {selectedEntry?.id === entry.id ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </Button>
                    {selectedEntry?.id === entry.id && (
                      <pre className="mt-2 text-xs bg-muted/50 rounded p-3 overflow-auto max-h-48">
                        {JSON.stringify(snapshot, null, 2)}
                      </pre>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
