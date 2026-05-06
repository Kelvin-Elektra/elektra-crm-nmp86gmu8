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
import { Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

  const handleSetSaleStage = async (stageId: string) => {
    const currentSaleStages = stages.filter((s) => s.is_sale_stage)

    // Clear others
    for (const stage of currentSaleStages) {
      if (stage.id !== stageId) {
        await pb.collection('pipeline_stages').update(stage.id, { is_sale_stage: false })
      }
    }

    // Set new
    if (stageId !== 'none') {
      await pb.collection('pipeline_stages').update(stageId, { is_sale_stage: true })
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
          <div className="space-y-6">
            <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border/50">
              <Label className="text-base font-semibold">
                Qual estágio representa a venda finalizada?
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Negociações marcadas como ganhas serão automaticamente movidas para este estágio.
              </p>
              <Select
                value={stages.find((s) => s.is_sale_stage)?.id || 'none'}
                onValueChange={handleSetSaleStage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estágio de venda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum estágio definido</SelectItem>
                  {stages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do novo estágio"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" /> Adicionar
                </Button>
              </div>
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
