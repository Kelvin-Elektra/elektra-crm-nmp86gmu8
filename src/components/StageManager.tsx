import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getPipelineStages,
  createPipelineStage,
  updatePipelineStage,
  deletePipelineStage,
} from '@/services/db'
import { useAuth } from '@/contexts/AuthContext'
import { Trash2, Plus, ArrowUp, ArrowDown, CheckCircle } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export function StageManager({ open, onOpenChange }: any) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [stages, setStages] = useState<any[]>([])
  const [newName, setNewName] = useState('')

  const load = async () => setStages(await getPipelineStages())
  useEffect(() => {
    if (open) load()
  }, [open])
  useRealtime('pipeline_stages', load, open)

  const isAdmin = user?.role === 'admin_company' || user?.role === 'admin_elektra'

  const handleCreate = async () => {
    if (!newName || !user?.company_id) return
    const order = stages.length > 0 ? Math.max(...stages.map((s) => s.order)) + 1 : 1
    await createPipelineStage({ name: newName, order, company_id: user.company_id })
    setNewName('')
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePipelineStage(id)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível excluir (pode estar em uso).',
      })
    }
  }

  const handleToggleSaleStage = async (stage: any) => {
    const isCurrentlySale = stage.is_sale_stage
    await pb.collection('pipeline_stages').update(stage.id, { is_sale_stage: !isCurrentlySale })

    if (!isCurrentlySale) {
      const others = stages.filter((s) => s.id !== stage.id && s.is_sale_stage)
      for (const other of others) {
        await pb.collection('pipeline_stages').update(other.id, { is_sale_stage: false })
      }
    }
    load()
  }

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === stages.length - 1) return

    const newStages = [...stages]
    const swapIndex = direction === 'up' ? index - 1 : index + 1

    const current = newStages[index]
    const other = newStages[swapIndex]

    const currentOrder = current.order
    current.order = other.order
    other.order = currentOrder

    newStages[index] = other
    newStages[swapIndex] = current

    setStages(newStages.sort((a, b) => a.order - b.order))

    await updatePipelineStage(current.id, { order: current.order })
    await updatePipelineStage(other.id, { order: other.order })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Estágios do Funil</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>Gerencie os estágios do funil de vendas.</DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        {!isAdmin ? (
          <p className="text-sm text-muted-foreground">
            Apenas administradores podem configurar o funil.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do estágio"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2 mt-4 max-h-60 overflow-y-auto">
              {stages.map((stage, i) => (
                <div
                  key={stage.id}
                  className="flex items-center justify-between p-2 border rounded bg-background"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{stage.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleSaleStage(stage)}
                      title={
                        stage.is_sale_stage
                          ? 'Estágio de Venda (Clique para remover)'
                          : 'Marcar como Estágio de Venda'
                      }
                    >
                      <CheckCircle
                        className={
                          stage.is_sale_stage
                            ? 'h-4 w-4 text-green-500'
                            : 'h-4 w-4 text-muted-foreground'
                        }
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMove(i, 'up')}
                      disabled={i === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMove(i, 'down')}
                      disabled={i === stages.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(stage.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
