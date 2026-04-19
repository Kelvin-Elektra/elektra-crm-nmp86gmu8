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
import { Plus, Trash2, Settings2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export function CostsTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [billingModel, setBillingModel] = useState('direct')
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

    try {
      const settings = await pb
        .collection('proposal_settings')
        .getFirstListItem(`company_id = '${user.company_id}'`)
      if (settings) {
        setSettingsId(settings.id)
        if (settings.billing_model) setBillingModel(settings.billing_model)
      }
    } catch (_) {
      // ignore
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleBillingModelChange = async (val: string) => {
    setBillingModel(val)
    if (!user?.company_id) return
    try {
      if (settingsId) {
        await pb.collection('proposal_settings').update(settingsId, { billing_model: val })
      } else {
        const r = await pb
          .collection('proposal_settings')
          .create({ company_id: user.company_id, billing_model: val })
        setSettingsId(r.id)
      }
      toast({ title: 'Sucesso', description: 'Modelo de faturamento atualizado.' })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar o modelo.' })
    }
  }

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
    <div className="space-y-6">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center">
            <Settings2 className="w-5 h-5 mr-2 text-primary" />
            Modelo de Faturamento
          </CardTitle>
          <CardDescription>
            Como a sua empresa fatura o kit fotovoltaico vendido ao cliente final?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={billingModel} onValueChange={handleBillingModelChange}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">
                Minha empresa fatura a venda com o valor cheio para o consumidor final
              </SelectItem>
              <SelectItem value="intermediated">
                O distribuidor fatura o kit e minha empresa fatura a diferença (serviço/lucro)
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custos e Impostos da venda PV</CardTitle>
          <CardDescription>Configure os custos relacionados a uma venda de kit pv.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={handleAdd}
            className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end bg-muted/30 p-4 rounded-lg"
          >
            <div className="space-y-2">
              <Label>Nome do Custo/Imposto</Label>
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
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  <SelectItem value="variable">Valor váriavel (R$)</SelectItem>
                  <SelectItem value="rate">Percentual sobre o valor da venda (%)</SelectItem>
                  <SelectItem value="tax">Imposto (%)</SelectItem>
                  <SelectItem value="margin">Margem de contribuição (%)</SelectItem>
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
            <div className="space-y-2 md:col-span-2">
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
                  <SelectItem value="modules">Qtde. de Módulos</SelectItem>
                  <SelectItem value="kwp">Potência Total (kWp)</SelectItem>
                  <SelectItem value="kw">Potência do Inversor (kW)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="md:col-span-5">
              <Plus className="w-4 h-4 mr-2" /> Salvar Regra
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
                      {d.calc_method === 'fixed' && 'Fixo'}
                      {d.calc_method === 'variable' && 'Variável'}
                      {d.calc_method === 'rate' && 'Percentual'}
                      {d.calc_method === 'tax' && 'Imposto'}
                      {d.calc_method === 'margin' && 'Margem'}
                    </td>
                    <td className="p-3">
                      {d.value}{' '}
                      {d.calc_method === 'fixed' || d.calc_method === 'variable' ? 'R$' : '%'}
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
    </div>
  )
}
