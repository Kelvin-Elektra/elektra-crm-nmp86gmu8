import { useState } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'
import { useProposalData } from '@/hooks/use-proposal-data'
import { ProposalDocument } from '@/components/proposal/ProposalDocument'

export function ProposalViewer({ open, onOpenChange, proposal, negotiation }: any) {
  const { data, pagesLayout, loading, snapshotReady } = useProposalData(proposal, negotiation, open)
  const [printWarning, setPrintWarning] = useState(false)

  const handlePrint = () => {
    if (!snapshotReady || loading) {
      setPrintWarning(true)
      setTimeout(() => setPrintWarning(false), 4000)
      return
    }
    setPrintWarning(false)
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] overflow-auto p-0 border-none bg-zinc-100/50 print:h-auto print:overflow-visible print:p-0 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="proposal-print-container bg-white mx-auto flex-1 w-full print:shadow-none print:block flex flex-col overflow-x-auto">
            <ProposalDocument data={data} pagesLayout={pagesLayout} />

            <div className="mt-auto p-8 border-t text-center print:hidden flex flex-col items-center justify-center bg-muted/20">
              {printWarning && (
                <div className="mb-4 flex items-center gap-2 text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Aguarde o carregamento completo dos dados da proposta antes de imprimir.
                  </span>
                </div>
              )}
              <p className="text-slate-500 mb-6">Pronto para imprimir?</p>
              <div className="flex gap-4">
                <Button
                  onClick={handlePrint}
                  className="px-8 shadow-lg"
                  style={{ backgroundColor: data.branding.primaryColor }}
                >
                  Imprimir Proposta (PDF)
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
