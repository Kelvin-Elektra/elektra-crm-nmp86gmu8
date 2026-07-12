import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Plus,
  Eye,
  DollarSign,
  FileText,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Pencil,
  History,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { format } from 'date-fns'
import { ProposalViewer } from '../ProposalViewer'
import { ProposalCostModal } from './ProposalCostModal'
import { ProposalWizardModal } from './ProposalWizardModal'
import { ProposalEditModal } from './ProposalEditModal'
import { ProposalHistoryDialog } from './ProposalHistoryDialog'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'

export function ProposalsTab({ proposals, neg, reload }: any) {
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin =
    user?.role === 'User_elektra' || user?.role_company === 'admin' || user?.role === 'User_owner'
  const [viewerOpen, setViewerOpen] = useState<any>(null)
  const [costModalOpen, setCostModalOpen] = useState<any>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [closeSaleModal, setCloseSaleModal] = useState<any>(null)
  const [editModalOpen, setEditModalOpen] = useState<any>(null)
  const [historyOpen, setHistoryOpen] = useState<any>(null)
  const [closingDate, setClosingDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const handleConfirmSale = async () => {
    if (!closingDate) {
      toast({ variant: 'destructive', title: 'A data é obrigatória' })
      return
    }
    try {
      await pb.collection('proposals').update(closeSaleModal.id, {
        status: 'accepted',
        closing_date: closingDate + ' 12:00:00',
      })

      const stages = await pb.collection('pipeline_stages').getFullList({
        filter: `company_id = '${closeSaleModal.company_id}' && is_sale_stage = true`,
      })

      if (stages.length > 0 && neg?.id) {
        await pb.collection('negotiations').update(neg.id, {
          stage: stages[0].id,
        })
      }

      toast({ title: 'Venda confirmada com sucesso!' })
      setCloseSaleModal(null)
      reload()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao confirmar venda' })
    }
  }

  const handleUndoSale = async (p: any) => {
    if (!confirm('Deseja desfazer a venda desta proposta?')) return
    try {
      await pb.collection('proposals').update(p.id, {
        status: 'Gerada',
        closing_date: '',
      })
      toast({ title: 'Venda desfeita' })
      reload()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao desfazer venda' })
    }
  }

  const handleGenerate = () => {
    setWizardOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta proposta?')) return
    try {
      await pb.collection('proposals').delete(id)
      toast({ title: 'Proposta excluída' })
      reload()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao excluir' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleGenerate}>
          <Plus className="h-4 w-4 mr-2" /> Gerar Proposta
        </Button>
      </div>

      {proposals.length === 0 ? (
        <Card className="bg-muted/10 border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-slate-800">Nenhuma proposta gerada</h3>
            <p className="text-sm text-slate-500 mt-2">
              Clique em "Gerar Proposta" para criar a primeira proposta comercial.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {proposals.map((p: any) => (
            <Card key={p.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {p.description || `Proposta #${p.id.slice(0, 5)}`}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-4">
                      <span>Gerada em: {format(new Date(p.created), 'dd/MM/yyyy')}</span>
                      <span className="font-semibold text-primary">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(p.total_value || p.price || 0)}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{p.status || 'Gerada'}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mt-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewerOpen(p)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" /> Visualizar
                  </Button>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditModalOpen(p)}
                      title="Editar Proposta"
                    >
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCostModalOpen(p)}
                      title="Editar Custos"
                    >
                      <DollarSign className="h-4 w-4 mr-2 text-green-600" /> Custos
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      p.status === 'accepted' ? handleUndoSale(p) : setCloseSaleModal(p)
                    }
                    className={
                      p.status === 'accepted'
                        ? 'text-amber-600 hover:bg-amber-600/10'
                        : 'text-green-600 hover:bg-green-600/10'
                    }
                    title={p.status === 'accepted' ? 'Desfazer Venda' : 'Marcar como Vendida'}
                  >
                    {p.status === 'accepted' ? (
                      <ThumbsDown className="h-4 w-4 mr-2" />
                    ) : (
                      <ThumbsUp className="h-4 w-4 mr-2" />
                    )}
                    {p.status === 'accepted' ? 'Desfazer Venda' : 'Vendido'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHistoryOpen(p)}
                    title="Histórico de Alterações"
                  >
                    <History className="h-4 w-4 mr-2 text-muted-foreground" /> Histórico
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(p.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {wizardOpen && (
        <ProposalWizardModal
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          neg={neg}
          reload={reload}
          openViewer={setViewerOpen}
        />
      )}

      {viewerOpen && (
        <ProposalViewer
          open={!!viewerOpen}
          onOpenChange={(v: boolean) => !v && setViewerOpen(null)}
          proposal={viewerOpen}
          negotiation={neg}
        />
      )}

      {costModalOpen && (
        <ProposalCostModal
          open={!!costModalOpen}
          onOpenChange={(v: boolean) => !v && setCostModalOpen(null)}
          proposal={costModalOpen}
          reload={reload}
          neg={neg}
        />
      )}

      {editModalOpen && (
        <ProposalEditModal
          open={!!editModalOpen}
          onOpenChange={(v: boolean) => !v && setEditModalOpen(null)}
          proposal={editModalOpen}
          reload={reload}
        />
      )}

      {historyOpen && (
        <ProposalHistoryDialog
          open={!!historyOpen}
          onOpenChange={(v: boolean) => !v && setHistoryOpen(null)}
          proposalId={historyOpen.id}
        />
      )}

      <Dialog open={!!closeSaleModal} onOpenChange={(v) => !v && setCloseSaleModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Data do Fechamento</Label>
              <Input
                type="date"
                value={closingDate}
                onChange={(e) => setClosingDate(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              A proposta será marcada como aprovada e a negociação será movida para o estágio de
              venda (se configurado).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseSaleModal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmSale}>Confirmar Venda</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
