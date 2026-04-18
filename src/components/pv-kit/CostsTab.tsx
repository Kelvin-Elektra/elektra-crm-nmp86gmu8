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
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'

export function CostsTab() {
  const { user } = useAuth()
  const [data, setData] = useState<any[]>([])
  const [form, setForm] = useState({
    name: '',
    range_type: 'none',
    calc_method: 'fixed',
    value: '',
  })

  const loadData = async () => {
    if (!user?.company_id) return
    const res = await pb.collection('pv_costs').getFullList()
    setData(res)
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id) return
    await pb
      .collection('pv_costs')
      .create({ ...form, value: Number(form.value), company_id: user.company_id })
    setForm({ name: '', range_type: 'none', calc_method: 'fixed', value: '' })
    loadData()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custos e Impostos</CardTitle>
        <CardDescription>
          Configure impostos, engenharias, instalação e margens com cálculo por dentro e mark-up.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-muted/30 p-4 rounded-lg"
        >
          <div className="space-y-2">
            <Label>Nome da Taxa</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Método de Cálculo</Label>
            <Select
              value={form.calc_method}
              onValueChange={(v) => setForm({ ...form, calc_method: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                <SelectItem value="rate">Percentual Simples (%)</SelectItem>
                <SelectItem value="inside">Cálculo Por Dentro (%)</SelectItem>
                <SelectItem value="markup">Mark-up sobre o Kit (%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor / Porcentagem</Label>
            <Input
              required
              type="number"
              step="0.01"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Condição (Range)</Label>
            <Select
              value={form.range_type}
              onValueChange={(v) => setForm({ ...form, range_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sempre aplicar</SelectItem>
                <SelectItem value="modules">Por Qtde. Módulos</SelectItem>
                <SelectItem value="kwp">Por Potência kWp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit">
            <Plus className="w-4 h-4 mr-2" /> Salvar
          </Button>
        </form>

        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">Método</th>
                <th className="p-3 font-medium">Valor / %</th>
                <th className="p-3 font-medium">Aplicação</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3 capitalize">
                    {d.calc_method
                      .replace('inside', 'Por Dentro')
                      .replace('fixed', 'Fixo')
                      .replace('rate', 'Simples')}
                  </td>
                  <td className="p-3">
                    {d.value} {d.calc_method !== 'fixed' ? '%' : 'R$'}
                  </td>
                  <td className="p-3 capitalize">
                    {d.range_type === 'none' ? 'Geral' : d.range_type}
                  </td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => pb.collection('pv_costs').delete(d.id).then(loadData)}
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
