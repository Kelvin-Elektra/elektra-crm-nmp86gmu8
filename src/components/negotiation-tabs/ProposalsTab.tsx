import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Eye, DollarSign, FileText, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { format } from 'date-fns'
import { ProposalViewer } from '../ProposalViewer'
import { ProposalCostModal } from './ProposalCostModal'
import { Badge } from '@/components/ui/badge'

export function ProposalsTab({ proposals, neg, reload }: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [viewerOpen, setViewerOpen] = useState<any>(null)
  const [costModalOpen, setCostModalOpen] = useState<any>(null)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const newProp = await pb.collection('proposals').create({
        company_id: neg.company_id,
        negotiation_id: neg.id,
        status: 'Gerada',
        validity_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        price: 0,
        total_value: 0,
      })
      toast({ title: 'Proposta gerada com sucesso!' })
      reload()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao gerar proposta' })
    } finally {
      setLoading(false)
    }
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
        <Button onClick={handleGenerate} disabled={loading}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {proposals.map((p: any) => (
            <Card key={p.id} className="relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Proposta #{p.id.slice(0, 5)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Gerada em: {format(new Date(p.created), 'dd/MM/yyyy')}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{p.status || 'Gerada'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewerOpen(p)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" /> Visualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCostModalOpen(p)}
                    title="Editar Custos"
                  >
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(p.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
    </div>
  )
}
