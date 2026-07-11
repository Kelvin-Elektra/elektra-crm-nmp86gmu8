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
      <DialogContent className="max-w-[1200px] w-[90vw] h-[95vh] overflow-hidden p-0 border-none bg-slate-100 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="proposal-preview-wrapper flex-1 overflow-auto">
              <div
                className="proposal-print-container bg-white mx-auto"
                style={{ margin: 0, padding: 0 }}
              >
                <ProposalDocument data={data} pagesLayout={pagesLayout} />
              </div>
            </div>

            <div className="print:hidden p-6 border-t text-center bg-muted/20 shrink-0">
              {printWarning && (
                <div className="mb-4 flex items-center justify-center gap-2 text-destructive bg-destructive/10 px-4 py-2 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Aguarde o carregamento completo dos dados da proposta antes de imprimir.
                  </span>
                </div>
              )}
              <p className="text-slate-500 mb-4">Pronto para imprimir?</p>
              <div className="flex gap-4 justify-center">
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
