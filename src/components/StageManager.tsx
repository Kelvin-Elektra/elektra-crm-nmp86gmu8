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
import { Trash2, Plus, ArrowUp, ArrowDown, Pencil, Check, X } from 'lucide-react'
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const load = async () => setStages(await getPipelineStages())
  useEffect(() => {
    if (open) load()
  }, [open])
  useRealtime('pipeline_stages', load, open)

  const isAdmin =
    user?.role === 'admin_company' ||
    user?.role === 'admin_elektra' ||
    user?.role_company === 'admin'

  const handleCreate = async () => {
    if (!newName || !user?.company_id) return
    const order = stages.length > 0 ? Math.max(...stages.map((s) => s.order)) + 1 : 1
    await createPipelineStage({ name: newName, order, company_id: user.company_id })
    setNewName('')
  }

  const handleDelete = async (id: string) => {
    try {
      await deletePipelineStage(id)
      load()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível excluir (pode estar em uso).',
      })
    }
  }

  const handleStartRename = (stage: any) => {
    setEditingId(stage.id)
    setEditingName(stage.name)
  }

  const handleCancelRename = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleSaveRename = async (stageId: string) => {
    const trimmed = editingName.trim()
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Nome inválido',
        description: 'O nome do estágio não pode estar vazio.',
      })
      return
    }
    try {
      await updatePipelineStage(stageId, { name: trimmed })
      toast({ title: 'Sucesso', description: 'Estágio renomeado com sucesso.' })
      setEditingId(null)
      setEditingName('')
      load()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao renomear',
        description: err?.message || 'Falha ao atualizar o nome do estágio.',
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

            <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border/50">
              <Label className="text-base font-semibold">
                Qual estágio representa as negociações perdidas?
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Negociações perdidas ficam ocultas do funil principal para não poluir o painel e
                exigem o motivo da perda.
              </p>
              <Select
                value={stages.find((s) => s.is_loss_stage)?.id || 'none'}
                onValueChange={async (stageId) => {
                  try {
                    for (const s of stages) {
                      const shouldBeLoss = s.id === stageId
                      if (!!s.is_loss_stage !== shouldBeLoss) {
                        await updatePipelineStage(s.id, { is_loss_stage: shouldBeLoss })
                      }
                    }
                    toast({ title: 'Estágio de perda atualizado com sucesso' })
                    load()
                  } catch (err: any) {
                    toast({ variant: 'destructive', title: 'Erro ao salvar estágio de perda' })
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estágio de perda" />
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
                  className="flex items-center justify-between p-2 border rounded bg-background gap-2"
                >
                  {editingId === stage.id ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(stage.id)
                          if (e.key === 'Escape') handleCancelRename()
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
                        onClick={() => handleSaveRename(stage.id)}
                        title="Salvar"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:bg-muted shrink-0"
                        onClick={handleCancelRename}
                        title="Cancelar"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">{stage.name}</span>
                        {stage.is_sale_stage && (
                          <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded-full font-medium">
                            Venda
                          </span>
                        )}
                        {stage.is_loss_stage && (
                          <span className="text-xs bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200 px-2 py-0.5 rounded-full font-medium">
                            Perda (Oculto)
                          </span>
                        )}{' '}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartRename(stage)}
                          title="Renomear estágio"
                          className="h-8 w-8"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMove(i, 'up')}
                          disabled={i === 0}
                          className="h-8 w-8"
                          title="Mover para cima"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleMove(i, 'down')}
                          disabled={i === stages.length - 1}
                          className="h-8 w-8"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(stage.id)}
                          className="h-8 w-8"
                          title="Excluir estágio"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
