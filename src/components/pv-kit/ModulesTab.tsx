import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Trash2, Pencil, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export function ModulesTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [distributors, setDistributors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [distFilter, setDistFilter] = useState('all')

  const initialForm = {
    name: '',
    power: '',
    brand: '',
    distributor_id: '',
    height: '',
    width: '',
    price: '',
    notes: '',
  }
  const [form, setForm] = useState(initialForm)

  const loadData = async () => {
    if (!user?.company_id) return
    const [mods, dists] = await Promise.all([
      pb.collection('pv_modules').getFullList({ expand: 'distributor_id' }),
      pb.collection('pv_distributors').getFullList(),
    ])
    setData(mods)
    setDistributors(dists)
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id || !form.distributor_id) return
    setLoading(true)

    const payload = {
      ...form,
      power: Number(form.power),
      height: form.height ? Number(form.height.replace(',', '.')) : null,
      width: form.width ? Number(form.width.replace(',', '.')) : null,
      price: form.price ? Number(form.price.replace(',', '.')) : null,
      company_id: user.company_id,
    }

    try {
      if (editingId) {
        await pb.collection('pv_modules').update(editingId, payload)
        toast({ title: 'Sucesso', description: 'Módulo atualizado.' })
      } else {
        await pb.collection('pv_modules').create(payload)
        toast({ title: 'Sucesso', description: 'Módulo adicionado.' })
      }
      resetForm()
      loadData()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar o módulo.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (mod: any) => {
    setForm({
      name: mod.name,
      power: mod.power?.toString() || '',
      brand: mod.brand,
      distributor_id: mod.distributor_id,
      height: mod.height?.toString().replace('.', ',') || '',
      width: mod.width?.toString().replace('.', ',') || '',
      price: mod.price?.toString().replace('.', ',') || '',
      notes: mod.notes || '',
    })
    setEditingId(mod.id)
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('pv_modules').delete(id)
      toast({ title: 'Sucesso', description: 'Módulo removido.' })
      loadData()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao remover.' })
    }
  }

  const resetForm = () => {
    setForm({ ...initialForm, distributor_id: form.distributor_id })
    setEditingId(null)
  }

  const filteredData = data.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.brand.toLowerCase().includes(search.toLowerCase())
    const matchDist = distFilter === 'all' || d.distributor_id === distFilter
    return matchSearch && matchDist
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catálogo de Módulos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start bg-muted/30 p-5 rounded-xl border border-border/50"
        >
          <div className="space-y-2">
            <Label className="font-semibold">Distribuidora</Label>
            <Select
              value={form.distributor_id}
              onValueChange={(v) => setForm({ ...form, distributor_id: v })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {distributors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Nome/Modelo</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Potência (Wp)</Label>
            <Input
              required
              type="number"
              value={form.power}
              onChange={(e) => setForm({ ...form, power: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Marca</Label>
            <Input
              required
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Altura (m)</Label>
            <Input
              value={form.height}
              onChange={(e) => {
                let val = e.target.value.replace(/[^\d,]/g, '')
                const parts = val.split(',')
                if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('')
                setForm({ ...form, height: val })
              }}
              className="bg-background"
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Largura (m)</Label>
            <Input
              value={form.width}
              onChange={(e) => {
                let val = e.target.value.replace(/[^\d,]/g, '')
                const parts = val.split(',')
                if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('')
                setForm({ ...form, width: val })
              }}
              className="bg-background"
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Preço</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                R$
              </span>
              <Input
                value={form.price}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^\d,]/g, '')
                  const parts = val.split(',')
                  if (parts.length > 2) val = parts[0] + ',' + parts.slice(1).join('')
                  setForm({ ...form, price: val })
                }}
                className="pl-9 bg-background"
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Observações</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="md:col-span-4 flex justify-end gap-2 mt-2">
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {editingId ? (
                'Salvar Alterações'
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Módulo
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por modelo ou marca..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={distFilter} onValueChange={setDistFilter}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Filtrar Distribuidora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Distribuidoras</SelectItem>
              {distributors.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">Modelo</th>
                <th className="p-3 font-medium">Marca</th>
                <th className="p-3 font-medium">Potência</th>
                <th className="p-3 font-medium">Dimensões (m)</th>
                <th className="p-3 font-medium">Área (m²)</th>
                <th className="p-3 font-medium">Preço</th>
                <th className="p-3 font-medium">Distribuidora</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((d) => (
                <tr key={d.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3">{d.brand}</td>
                  <td className="p-3">{d.power} Wp</td>
                  <td className="p-3">{d.height && d.width ? `${d.height}x${d.width}` : '-'}</td>
                  <td className="p-3">
                    {d.height && d.width ? (d.height * d.width).toFixed(2) : '-'}
                  </td>
                  <td className="p-3">
                    {d.price
                      ? `R$ ${d.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '-'}
                  </td>
                  <td className="p-3">{d.expand?.distributor_id?.name}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(d)}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    Nenhum módulo encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
