import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useProposalData } from '@/hooks/use-proposal-data'
import {
  getTemplateClasses,
  ELEMENT_TO_SECTION,
  type ProposalPageData,
} from '@/components/proposal/proposal-utils'
import { ProposalCover } from '@/components/proposal/ProposalCover'
import { ProposalSummary } from '@/components/proposal/ProposalSummary'
import { ProposalComponents } from '@/components/proposal/ProposalComponents'
import { ProposalFinancial } from '@/components/proposal/ProposalFinancial'
import { ProposalExecution } from '@/components/proposal/ProposalExecution'
import { ProposalInvestment } from '@/components/proposal/ProposalInvestment'

const SECTION_COMPONENTS: Record<string, React.FC<{ data: ProposalPageData }>> = {
  cover: ProposalCover,
  summary: ProposalSummary,
  components: ProposalComponents,
  financial: ProposalFinancial,
  execution: ProposalExecution,
  investment: ProposalInvestment,
}

export function ProposalViewer({ open, onOpenChange, proposal, negotiation }: any) {
  const { data, pagesLayout, loading } = useProposalData(proposal, negotiation, open)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[95vh] overflow-y-auto p-0 border-none bg-zinc-100/50 print:h-auto print:overflow-visible flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div
            className={`bg-white mx-auto max-w-4xl shadow-2xl flex-1 w-full print:shadow-none print:w-full print:max-w-full print:bg-white print:m-0 print:block flex flex-col ${getTemplateClasses(data.template)}`}
          >
            {pagesLayout.map((page: any) => {
              const seen = new Set<string>()
              const sections = page.elements
                .map((elId: string) => ELEMENT_TO_SECTION[elId] || elId)
                .filter((s: string) => {
                  if (seen.has(s)) return false
                  seen.add(s)
                  return true
                })

              return (
                <div
                  key={page.id}
                  className="min-h-[100vh] break-inside-avoid print:mb-0 border-b last:border-b-0 border-dashed border-slate-200 print:border-none"
                >
                  {sections.map((sId: string) => {
                    const Cmp = SECTION_COMPONENTS[sId]
                    return Cmp ? <Cmp key={sId} data={data} /> : null
                  })}
                </div>
              )
            })}

            <div className="mt-auto p-8 border-t text-center print:hidden flex flex-col items-center justify-center bg-muted/20">
              <p className="text-slate-500 mb-6">Pronto para imprimir?</p>
              <div className="flex gap-4">
                <Button
                  onClick={() => window.print()}
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
