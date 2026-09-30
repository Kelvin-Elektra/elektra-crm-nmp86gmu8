import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { maskCNPJ } from '@/lib/masks'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'

export function DistributorsTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', cnpj: '' })
  const [editingDistributor, setEditingDistributor] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({ name: '', cnpj: '' })
  const [editLoading, setEditLoading] = useState(false)

  const loadData = async () => {
    if (!user?.company_id) return
    const res = await pb.collection('pv_distributors').getFullList({
      filter: `company_id='${user.company_id}'`,
    })
    setData(res)
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id) return

    const exists = data.some((d) => d.name.toLowerCase() === form.name.toLowerCase())
    if (exists) {
      return toast({
        variant: 'destructive',
        title: `A distribuidora/concessionária ${form.name} já está cadastrada.`,
      })
    }

    setLoading(true)
    try {
      await pb.collection('pv_distributors').create({ ...form, company_id: user.company_id })
      toast({ title: 'Sucesso', description: 'Distribuidora adicionada.' })
      setForm({ name: '', cnpj: '' })
      loadData()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('pv_distributors').delete(id)
      toast({ title: 'Sucesso', description: 'Distribuidora excluída.' })
      loadData()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir.' })
    }
  }

  const openEdit = (dist: any) => {
    setEditingDistributor(dist)
    setEditForm({ name: dist.name || '', cnpj: maskCNPJ(dist.cnpj || '') })
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDistributor || !user?.company_id) return

    const trimmedName = editForm.name.trim()
    if (!trimmedName) {
      return toast({ variant: 'destructive', title: 'Nome obrigatório' })
    }

    // Validação de unicidade por empresa (excluindo a própria que está sendo editada)
    const exists = data.some(
      (d) =>
        d.id !== editingDistributor.id && d.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    )
    if (exists) {
      return toast({
        variant: 'destructive',
        title: `Já existe outra distribuidora com o nome "${trimmedName}".`,
      })
    }

    setEditLoading(true)
    try {
      await pb.collection('pv_distributors').update(editingDistributor.id, {
        name: trimmedName,
        cnpj: editForm.cnpj.trim(),
      })
      toast({ title: 'Sucesso', description: 'Distribuidora atualizada com sucesso.' })
      setEditingDistributor(null)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Falha ao atualizar a distribuidora.',
      })
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuidoras Homologadas</CardTitle>
        <CardDescription>Cadastre os fornecedores para vincular aos equipamentos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAdd} className="flex gap-4 items-end bg-muted/30 p-4 rounded-lg">
          <div className="flex-1 space-y-2">
            <Label>Nome da Distribuidora</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label>CNPJ</Label>
            <Input
              placeholder="00.000.000/0000-00"
              value={form.cnpj}
              onChange={(e) => setForm({ ...form, cnpj: maskCNPJ(e.target.value) })}
            />
          </div>
          <Button type="submit" disabled={loading}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </form>

        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">CNPJ</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">{d.name}</td>
                  <td className="p-3">{d.cnpj ? maskCNPJ(d.cnpj) : '-'}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(d)}
                      title="Editar distribuidora"
                    >
                      <Pencil className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(d.id)}
                      title="Excluir distribuidora"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted-foreground">
                    Nenhuma cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Modal de Edição de Distribuidora */}
      {editingDistributor && (
        <Dialog
          open={!!editingDistributor}
          onOpenChange={(open) => !open && setEditingDistributor(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Distribuidora</DialogTitle>
              <VisuallyHidden>
                <DialogDescription>
                  Edite o nome e CNPJ da distribuidora homologada.
                </DialogDescription>
              </VisuallyHidden>
            </DialogHeader>
            <form onSubmit={handleEditSave} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Nome da Distribuidora</Label>
                <Input
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Nome do fornecedor / distribuidora"
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={editForm.cnpj}
                  onChange={(e) => setEditForm({ ...editForm, cnpj: maskCNPJ(e.target.value) })}
                  className="bg-background"
                />
              </div>
              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingDistributor(null)}
                  disabled={editLoading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={editLoading}>
                  {editLoading ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  )
}
