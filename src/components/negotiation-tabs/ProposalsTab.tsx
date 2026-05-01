import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Calendar, Eye, Download, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

import { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { ProposalViewer } from '@/components/ProposalViewer'
import { ProposalWizardModal } from './ProposalWizardModal'
import { useToast } from '@/hooks/use-toast'

export function ProposalsTab({
  proposals,
  neg,
  reload,
}: {
  proposals: any[]
  neg: any
  reload: () => void
}) {
  const { toast } = useToast()
  const [viewerOpen, setViewerOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedProposal, setSelectedProposal] = useState<any>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta proposta?')) return
    try {
      await pb.collection('proposals').delete(id)
      toast({ title: 'Proposta excluída' })
      reload()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: e.message })
    }
  }

  const openViewer = (proposal: any) => {
    setSelectedProposal(proposal)
    setViewerOpen(true)
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Propostas Fotovoltaicas</CardTitle>
            <CardDescription>Histórico de propostas comerciais enviadas.</CardDescription>
          </div>
          <Button size="sm" onClick={() => setWizardOpen(true)}>
            <FileText className="h-4 w-4 mr-2" /> Gerar Proposta
          </Button>
        </CardHeader>
        <CardContent>
          {proposals.length === 0 ? (
            <div className="text-center p-6 text-muted-foreground border rounded-lg bg-muted/20">
              Nenhuma proposta gerada para esta negociação.
            </div>
          ) : (
            <div className="space-y-4">
              {proposals.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{p.description || 'Proposta Padrão'}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                        <span title="Data de Criação">
                          <Calendar className="h-3 w-3 inline mr-1" />{' '}
                          {format(new Date(p.created), 'dd/MM/yyyy')}
                        </span>
                        {p.validity_date && (
                          <span>• Validade: {format(new Date(p.validity_date), 'dd/MM/yyyy')}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(p.total_value || p.price || 0)}
                      </p>
                      <Badge
                        variant={
                          p.status === 'accepted'
                            ? 'default'
                            : p.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {p.status || 'Rascunho'}
                      </Badge>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        title="Ver PDF"
                        onClick={() => openViewer(p)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        title="Baixar PDF"
                        onClick={() => openViewer(p)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        title="Excluir"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {wizardOpen && (
        <ProposalWizardModal
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          neg={neg}
          reload={reload}
          openViewer={openViewer}
        />
      )}

      {selectedProposal && (
        <ProposalViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          proposal={selectedProposal}
          negotiation={neg}
        />
      )}
    </>
  )
}
