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
import { Skeleton } from '@/components/ui/skeleton'

export function InvertersTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [distributors, setDistributors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [distFilter, setDistFilter] = useState('all')

  const initialForm = {
    name: '',
    power: '',
    brand: '',
    distributor_id: '',
    type: 'monofásico',
    voltage: '',
    warranty: '',
    obs: '',
    overload: '30',
    price: '',
    mppt: '1',
  }
  const [form, setForm] = useState(initialForm)

  const handleNumberChange = (field: string, value: string) => {
    let clean = value.replace(/[^0-9,]/g, '')
    const parts = clean.split(',')
    if (parts.length > 2) {
      clean = parts[0] + ',' + parts.slice(1).join('')
    }
    setForm({ ...form, [field]: clean })
  }

  const parseNumber = (val: string) => (val ? Number(val.replace(',', '.')) : 0)
  const formatNumber = (val: number | string | null | undefined) =>
    val !== null && val !== undefined ? val.toString().replace('.', ',') : ''

  const loadData = async () => {
    if (!user?.company_id) return
    setFetching(true)
    try {
      const [invs, dists] = await Promise.all([
        pb.collection('pv_inverters').getFullList({ expand: 'distributor_id' }),
        pb.collection('pv_distributors').getFullList(),
      ])
      setData(invs)
      setDistributors(dists)
    } finally {
      setFetching(false)
    }
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
      power: parseNumber(form.power),
      overload: parseNumber(form.overload),
      price: form.price ? parseNumber(form.price) : null,
      mppt: parseNumber(form.mppt),
      company_id: user.company_id,
    }

    try {
      if (editingId) {
        await pb.collection('pv_inverters').update(editingId, payload)
        toast({ title: 'Sucesso', description: 'Inversor atualizado.' })
      } else {
        await pb.collection('pv_inverters').create(payload)
        toast({ title: 'Sucesso', description: 'Inversor adicionado.' })
      }
      resetForm()
      loadData()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar o inversor.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (inv: any) => {
    setForm({
      name: inv.name,
      power: formatNumber(inv.power),
      brand: inv.brand,
      distributor_id: inv.distributor_id,
      type: inv.type,
      voltage: inv.voltage || '',
      warranty: inv.warranty || '',
      obs: inv.obs || '',
      overload: formatNumber(inv.overload),
      price: formatNumber(inv.price),
      mppt: formatNumber(inv.mppt),
    })
    setEditingId(inv.id)
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('pv_inverters').delete(id)
      toast({ title: 'Sucesso', description: 'Inversor removido.' })
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
        <CardTitle>Catálogo de Inversores</CardTitle>
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
            <Label className="font-semibold">Potência (kW)</Label>
            <Input
              required
              type="text"
              value={form.power}
              onChange={(e) => handleNumberChange('power', e.target.value)}
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
            <Label className="font-semibold">Fase</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monofásico">Monofásico</SelectItem>
                <SelectItem value="trifásico">Trifásico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Tensão</Label>
            <Select value={form.voltage} onValueChange={(v) => setForm({ ...form, voltage: v })}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="220V">220V</SelectItem>
                <SelectItem value="380V">380V</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Overload Max (%)</Label>
            <Input
              required
              type="text"
              value={form.overload}
              onChange={(e) => handleNumberChange('overload', e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">MPPT</Label>
            <Input
              required
              type="text"
              value={form.mppt}
              onChange={(e) => handleNumberChange('mppt', e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Garantia</Label>
            <Input
              placeholder="Ex: 10 anos"
              value={form.warranty}
              onChange={(e) => setForm({ ...form, warranty: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Preço (R$)</Label>
            <Input
              type="text"
              value={form.price}
              onChange={(e) => handleNumberChange('price', e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="font-semibold">Observações</Label>
            <Input
              value={form.obs}
              onChange={(e) => setForm({ ...form, obs: e.target.value })}
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
                  <Plus className="w-4 h-4 mr-2" /> Salvar Inversor
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
                <th className="p-3 font-medium">Nome/Modelo</th>
                <th className="p-3 font-medium">Marca</th>
                <th className="p-3 font-medium">Potência</th>
                <th className="p-3 font-medium">Fase/Tensão</th>
                <th className="p-3 font-medium">Overload/MPPT</th>
                <th className="p-3 font-medium">Garantia</th>
                <th className="p-3 font-medium">Preço</th>
                <th className="p-3 font-medium">Distribuidora</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-3 text-right">
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-foreground">
                    Nenhum inversor encontrado.
                  </td>
                </tr>
              ) : (
                filteredData.map((d) => (
                  <tr key={d.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{d.name}</td>
                    <td className="p-3">{d.brand}</td>
                    <td className="p-3">{formatNumber(d.power)} kW</td>
                    <td className="p-3 capitalize">
                      {d.type} {d.voltage && `(${d.voltage})`}
                    </td>
                    <td className="p-3">
                      {formatNumber(d.overload)}% / {formatNumber(d.mppt)}x
                    </td>
                    <td className="p-3">{d.warranty || '-'}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
