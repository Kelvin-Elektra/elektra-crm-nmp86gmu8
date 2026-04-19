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

export function InvertersTab() {
  const { user } = useAuth()
  const [data, setData] = useState<any[]>([])
  const [distributors, setDistributors] = useState<any[]>([])
  const [form, setForm] = useState({
    name: '',
    power: '',
    brand: '',
    distributor_id: '',
    type: 'monofásico',
    overload: '30',
    price: '',
    mppt: '1',
  })

  const loadData = async () => {
    if (!user?.company_id) return
    const [invs, dists] = await Promise.all([
      pb.collection('pv_inverters').getFullList({ expand: 'distributor_id' }),
      pb.collection('pv_distributors').getFullList(),
    ])
    setData(invs)
    setDistributors(dists)
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id || !form.distributor_id) return
    await pb.collection('pv_inverters').create({
      ...form,
      power: Number(form.power),
      overload: Number(form.overload),
      price: Number(form.price),
      mppt: Number(form.mppt),
      company_id: user.company_id,
    })
    setForm({
      name: '',
      power: '',
      brand: '',
      distributor_id: form.distributor_id,
      type: 'monofásico',
      overload: '30',
      price: '',
      mppt: '1',
    })
    loadData()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catálogo de Inversores</CardTitle>
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
            <Label>Modelo</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Potência (kW)</Label>
            <Input
              required
              type="number"
              step="0.1"
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
            <Label>Fase</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monofásico">Monofásico</SelectItem>
                <SelectItem value="trifásico">Trifásico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Overload Max (%)</Label>
            <Input
              required
              type="number"
              value={form.overload}
              onChange={(e) => setForm({ ...form, overload: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Preço (R$)</Label>
            <Input
              required
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>MPPT</Label>
            <Input
              required
              type="number"
              value={form.mppt}
              onChange={(e) => setForm({ ...form, mppt: e.target.value })}
            />
          </div>
          <div className="col-span-1 md:col-span-4 flex justify-end">
            <Button type="submit" className="w-full md:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Salvar Inversor
            </Button>
          </div>
        </form>
        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">Modelo</th>
                <th className="p-3 font-medium">Potência</th>
                <th className="p-3 font-medium">Overload</th>
                <th className="p-3 font-medium">MPPT</th>
                <th className="p-3 font-medium">Preço</th>
                <th className="p-3 font-medium">Distribuidora</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">{d.name}</td>
                  <td className="p-3">{d.power} kW</td>
                  <td className="p-3">{d.overload}%</td>
                  <td className="p-3">{d.mppt}</td>
                  <td className="p-3">{d.price ? `R$ ${d.price}` : '-'}</td>
                  <td className="p-3">{d.expand?.distributor_id?.name}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => pb.collection('pv_inverters').delete(d.id).then(loadData)}
                    >
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
