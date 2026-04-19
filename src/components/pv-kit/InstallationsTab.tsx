import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

export function InstallationsTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', purlin_type: 'Terças de madeira' })

  const loadData = async () => {
    if (!user?.company_id) return
    setLoading(true)
    try {
      const res = await pb.collection('pv_installations').getFullList()
      setData(res)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id) return
    try {
      if (editingId) {
        await pb.collection('pv_installations').update(editingId, form)
        toast({ title: 'Sucesso', description: 'Instalação atualizada.' })
      } else {
        await pb.collection('pv_installations').create({ ...form, company_id: user.company_id })
        toast({ title: 'Sucesso', description: 'Instalação adicionada.' })
      }
      resetForm()
      loadData()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar.' })
    }
  }

  const handleEdit = (item: any) => {
    setForm({ name: item.name, purlin_type: item.purlin_type || 'Terças de madeira' })
    setEditingId(item.id)
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('pv_installations').delete(id)
      toast({ title: 'Sucesso', description: 'Instalação removida.' })
      loadData()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao remover.' })
    }
  }

  const resetForm = () => {
    setForm({ name: '', purlin_type: 'Terças de madeira' })
    setEditingId(null)
  }

  const defaultNames = ['Aluzinco', 'Telha', 'Fibrocimento', 'Eternit', 'Solo', 'Carport']

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de Instalação</CardTitle>
        <CardDescription>Defina os tipos de telhados ou solo para dimensionamento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-muted/30 p-5 rounded-xl border border-border/50"
        >
          <div className="md:col-span-5 flex flex-col gap-2">
            <Label className="font-semibold">Nome do Tipo</Label>
            <Input
              required
              placeholder="Ex: Cerâmica"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-background"
            />
            <div className="flex flex-wrap gap-1.5 mt-1">
              {defaultNames.map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setForm({ ...form, name: n })}
                  className="text-[11px] bg-background border hover:bg-primary hover:text-primary-foreground px-2.5 py-1 rounded-md transition-colors"
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-4 flex flex-col gap-2">
            <Label className="font-semibold">Enterçamento Base</Label>
            <Select
              value={form.purlin_type}
              onValueChange={(v) => setForm({ ...form, purlin_type: v })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Terças de madeira">Terças de madeira</SelectItem>
                <SelectItem value="Terças de metal">Terças de metal</SelectItem>
                <SelectItem value="Solo">Solo</SelectItem>
                <SelectItem value="Irrelevante">Irrelevante</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3 flex flex-col gap-2 justify-start">
            <Label className="invisible hidden md:block">Ação</Label>
            <div className="flex gap-2">
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm} className="w-full">
                  Cancelar
                </Button>
              )}
              <Button type="submit" className="w-full">
                {editingId ? (
                  'Salvar'
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>

        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">Enterçamento Base</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="p-3 text-right">
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-muted-foreground">
                    Nenhuma instalação encontrada.
                  </td>
                </tr>
              ) : (
                data.map((d) => (
                  <tr key={d.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{d.name}</td>
                    <td className="p-3">{d.purlin_type || '-'}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(d)}>
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
