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
import { useToast } from '@/hooks/use-toast'

export function SuppliesTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [installations, setInstallations] = useState<any[]>([])
  const [form, setForm] = useState({
    name: '',
    price: '',
    calc_base: 'modules',
    multiplier: '1',
    installation_id: 'all',
    range_type: 'none',
    max_val: '',
  })

  const loadData = async () => {
    if (!user?.company_id) return
    const [supplies, insts] = await Promise.all([
      pb.collection('pv_supplies').getFullList({ expand: 'installation_id' }),
      pb.collection('pv_installations').getFullList(),
    ])
    setData(supplies)
    setInstallations(insts)
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id) return
    try {
      await pb.collection('pv_supplies').create({
        ...form,
        price: Number(form.price),
        multiplier: Number(form.multiplier),
        max_val: form.max_val ? Number(form.max_val) : null,
        installation_id: form.installation_id === 'all' ? null : form.installation_id,
        company_id: user.company_id,
      })
      toast({ title: 'Sucesso', description: 'Insumo adicionado.' })
      setForm({
        name: '',
        price: '',
        calc_base: 'modules',
        multiplier: '1',
        installation_id: 'all',
        range_type: 'none',
        max_val: '',
      })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível adicionar o insumo.',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Insumos e Acessórios</CardTitle>
        <CardDescription>
          Gerencie acessórios extras, fios, parafusos e defina regras dinâmicas de cálculo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-muted/30 p-4 rounded-lg"
        >
          <div className="space-y-2">
            <Label>Nome do Insumo</Label>
            <Input
              required
              placeholder="Ex: Parafuso fibrocimento"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Preço Unitário (R$)</Label>
            <Input
              required
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Instalação Alvo</Label>
            <Select
              value={form.installation_id}
              onValueChange={(v) => setForm({ ...form, installation_id: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {installations.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Base de Cálculo (Fórmula)</Label>
            <Select
              value={form.calc_base}
              onValueChange={(v) => setForm({ ...form, calc_base: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modules">Qtd. de Módulos</SelectItem>
                <SelectItem value="inverters">Qtd. de Inversores</SelectItem>
                <SelectItem value="kwp">Potência (kWp)</SelectItem>
                <SelectItem value="fixed">Fixo (1 unidade)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Multiplicador</Label>
            <Input
              required
              type="number"
              step="0.1"
              value={form.multiplier}
              onChange={(e) => setForm({ ...form, multiplier: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">Ex: 2 * Base</p>
          </div>
          <div className="space-y-2">
            <Label>Limitar Faixa Por</Label>
            <Select
              value={form.range_type}
              onValueChange={(v) => setForm({ ...form, range_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem limite</SelectItem>
                <SelectItem value="modules">Módulos (Até Max)</SelectItem>
                <SelectItem value="kwp">kWp (Até Max)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor Máximo da Faixa</Label>
            <Input
              type="number"
              disabled={form.range_type === 'none'}
              value={form.max_val}
              onChange={(e) => setForm({ ...form, max_val: e.target.value })}
            />
          </div>
          <Button type="submit" className="md:col-span-1">
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </form>

        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">Preço</th>
                <th className="p-3 font-medium">Fórmula</th>
                <th className="p-3 font-medium">Instalação</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">{d.name}</td>
                  <td className="p-3">R$ {d.price}</td>
                  <td className="p-3">
                    {d.multiplier} x {d.calc_base}
                  </td>
                  <td className="p-3">{d.expand?.installation_id?.name || 'Todas'}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => pb.collection('pv_supplies').delete(d.id).then(loadData)}
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
