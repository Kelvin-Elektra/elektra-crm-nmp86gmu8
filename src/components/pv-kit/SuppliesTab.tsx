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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export function SuppliesTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [supplies, setSupplies] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [distributors, setDistributors] = useState<any[]>([])
  const [installations, setInstallations] = useState<any[]>([])

  const [supplyForm, setSupplyForm] = useState({
    name: '',
    price: '',
    global: true,
    distributor_id: 'all',
  })

  const [ruleForm, setRuleForm] = useState({
    supply_id: '',
    installation_id: 'all',
    calc_base: 'modules',
    multiplier: '1',
    range_type: 'none',
    min_val: '',
    max_val: '',
  })

  const loadData = async () => {
    if (!user?.company_id) return
    const [suppData, ruleData, dists, insts] = await Promise.all([
      pb.collection('pv_supplies').getFullList({ expand: 'distributor_id' }),
      pb.collection('pv_supply_rules').getFullList({ expand: 'supply_id,installation_id' }),
      pb.collection('pv_distributors').getFullList(),
      pb.collection('pv_installations').getFullList(),
    ])
    setSupplies(suppData)
    setRules(ruleData)
    setDistributors(dists)
    setInstallations(insts)
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleAddSupply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id) return
    try {
      await pb.collection('pv_supplies').create({
        name: supplyForm.name,
        price: Number(supplyForm.price),
        distributor_id: supplyForm.global
          ? null
          : supplyForm.distributor_id === 'all'
            ? null
            : supplyForm.distributor_id,
        calc_base: 'fixed',
        multiplier: 1,
        range_type: 'none',
        company_id: user.company_id,
      })
      toast({ title: 'Sucesso', description: 'Insumo adicionado.' })
      setSupplyForm({ name: '', price: '', global: true, distributor_id: 'all' })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível adicionar o insumo.',
      })
    }
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id || !ruleForm.supply_id) return
    try {
      await pb.collection('pv_supply_rules').create({
        supply_id: ruleForm.supply_id,
        installation_id: ruleForm.installation_id === 'all' ? null : ruleForm.installation_id,
        calc_base: ruleForm.calc_base,
        multiplier: Number(ruleForm.multiplier),
        range_type: ruleForm.range_type,
        min_val: ruleForm.min_val ? Number(ruleForm.min_val) : null,
        max_val: ruleForm.max_val ? Number(ruleForm.max_val) : null,
        company_id: user.company_id,
      })
      toast({ title: 'Sucesso', description: 'Regra adicionada.' })
      setRuleForm({ ...ruleForm, min_val: '', max_val: '' })
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível adicionar a regra.',
      })
    }
  }

  return (
    <Tabs defaultValue="cadastro" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="cadastro">Cadastro de Insumos</TabsTrigger>
        <TabsTrigger value="regras">Regras de Cálculo</TabsTrigger>
      </TabsList>

      <TabsContent value="cadastro">
        <Card>
          <CardHeader>
            <CardTitle>Cadastro de Insumos</CardTitle>
            <CardDescription>Cadastre os materiais com seus valores unitários.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={handleAddSupply}
              className="flex flex-col gap-4 bg-muted/30 p-4 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Switch
                  checked={supplyForm.global}
                  onCheckedChange={(c) => setSupplyForm({ ...supplyForm, global: c })}
                />
                <Label>Aplicar a todos os distribuidores</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {!supplyForm.global && (
                  <div className="space-y-2">
                    <Label>Distribuidor</Label>
                    <Select
                      value={supplyForm.distributor_id}
                      onValueChange={(v) => setSupplyForm({ ...supplyForm, distributor_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Nenhum</SelectItem>
                        {distributors.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className={`space-y-2 ${supplyForm.global ? 'md:col-span-2' : ''}`}>
                  <Label>Nome do Insumo</Label>
                  <Input
                    required
                    placeholder="Ex: Cabo Solar 6mm"
                    value={supplyForm.name}
                    onChange={(e) => setSupplyForm({ ...supplyForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Unitário (R$)</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={supplyForm.price}
                    onChange={(e) => setSupplyForm({ ...supplyForm, price: e.target.value })}
                  />
                </div>
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar
                </Button>
              </div>
            </form>

            <div className="rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 font-medium">Nome</th>
                    <th className="p-3 font-medium">Distribuidor</th>
                    <th className="p-3 font-medium">Valor Un.</th>
                    <th className="p-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {supplies.map((d) => (
                    <tr key={d.id} className="border-t">
                      <td className="p-3">{d.name}</td>
                      <td className="p-3">{d.expand?.distributor_id?.name || 'Todos'}</td>
                      <td className="p-3">R$ {d.price}</td>
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
      </TabsContent>

      <TabsContent value="regras">
        <Card>
          <CardHeader>
            <CardTitle>Regras de Cálculo</CardTitle>
            <CardDescription>
              Vincule os insumos aos tipos de instalação e defina como eles multiplicam.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form
              onSubmit={handleAddRule}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-muted/30 p-4 rounded-lg"
            >
              <div className="space-y-2 md:col-span-2">
                <Label>Insumo</Label>
                <Select
                  required
                  value={ruleForm.supply_id}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, supply_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o insumo" />
                  </SelectTrigger>
                  <SelectContent>
                    {supplies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} (R$ {s.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Instalação Alvo</Label>
                <Select
                  value={ruleForm.installation_id}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, installation_id: v })}
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
                <Label>Base de Cálculo</Label>
                <Select
                  value={ruleForm.calc_base}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, calc_base: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modules">Qtde de módulos</SelectItem>
                    <SelectItem value="kwp">Potência kWp</SelectItem>
                    <SelectItem value="mppt">Por MPPT</SelectItem>
                    <SelectItem value="fixed">Fixo (1x)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Multiplicador</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={ruleForm.multiplier}
                  onChange={(e) => setRuleForm({ ...ruleForm, multiplier: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Aplicar na Faixa (De-Até)</Label>
                <div className="flex items-center gap-2">
                  <Select
                    value={ruleForm.range_type}
                    onValueChange={(v) => setRuleForm({ ...ruleForm, range_type: v })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sempre aplicar</SelectItem>
                      <SelectItem value="modules">Módulos</SelectItem>
                      <SelectItem value="kwp">kWp</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Min"
                    className="w-full"
                    disabled={ruleForm.range_type === 'none'}
                    value={ruleForm.min_val}
                    onChange={(e) => setRuleForm({ ...ruleForm, min_val: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    className="w-full"
                    disabled={ruleForm.range_type === 'none'}
                    value={ruleForm.max_val}
                    onChange={(e) => setRuleForm({ ...ruleForm, max_val: e.target.value })}
                  />
                </div>
              </div>
              <Button type="submit" className="md:col-span-4">
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </form>

            <div className="rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 font-medium">Insumo</th>
                    <th className="p-3 font-medium">Instalação</th>
                    <th className="p-3 font-medium">Fórmula</th>
                    <th className="p-3 font-medium">Faixa</th>
                    <th className="p-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 font-medium">{r.expand?.supply_id?.name}</td>
                      <td className="p-3">{r.expand?.installation_id?.name || 'Todas'}</td>
                      <td className="p-3">
                        {r.multiplier}x {r.calc_base}
                      </td>
                      <td className="p-3 capitalize">
                        {r.range_type === 'none'
                          ? 'Geral'
                          : `${r.range_type} (${r.min_val || 0} - ${r.max_val || '∞'})`}
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            pb.collection('pv_supply_rules').delete(r.id).then(loadData)
                          }
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
      </TabsContent>
    </Tabs>
  )
}
