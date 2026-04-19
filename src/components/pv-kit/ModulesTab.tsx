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
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export function ModulesTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [distributors, setDistributors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    power: '',
    brand: '',
    distributor_id: '',
    height: '',
    width: '',
    frame: '',
    notes: '',
  })

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
    try {
      await pb.collection('pv_modules').create({
        ...form,
        power: Number(form.power),
        height: form.height ? Number(form.height) : null,
        width: form.width ? Number(form.width) : null,
        company_id: user.company_id,
      })
      toast({ title: 'Sucesso', description: 'Módulo adicionado.' })
      setForm({
        name: '',
        power: '',
        brand: '',
        distributor_id: form.distributor_id,
        height: '',
        width: '',
        frame: '',
        notes: '',
      })
      loadData()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    await pb.collection('pv_modules').delete(id).then(loadData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catálogo de Módulos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-muted/30 p-4 rounded-lg"
        >
          <div className="space-y-2">
            <Label>Distribuidora</Label>
            <Select
              value={form.distributor_id}
              onValueChange={(v) => setForm({ ...form, distributor_id: v })}
            >
              <SelectTrigger>
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
            <Label>Nome/Modelo</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Potência (Wp)</Label>
            <Input
              required
              type="number"
              value={form.power}
              onChange={(e) => setForm({ ...form, power: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Marca</Label>
            <Input
              required
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Altura (mm)</Label>
            <Input
              type="number"
              value={form.height}
              onChange={(e) => setForm({ ...form, height: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Largura (mm)</Label>
            <Input
              type="number"
              value={form.width}
              onChange={(e) => setForm({ ...form, width: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Cor do Frame</Label>
            <Input
              placeholder="Ex: Preto"
              value={form.frame}
              onChange={(e) => setForm({ ...form, frame: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <Button type="submit" disabled={loading} className="md:col-span-4">
            <Plus className="w-4 h-4 mr-2" /> Salvar Módulo
          </Button>
        </form>
        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">Modelo</th>
                <th className="p-3 font-medium">Potência</th>
                <th className="p-3 font-medium">Marca</th>
                <th className="p-3 font-medium">Distribuidora</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">{d.name}</td>
                  <td className="p-3">{d.power} Wp</td>
                  <td className="p-3">{d.brand}</td>
                  <td className="p-3">{d.expand?.distributor_id?.name}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
