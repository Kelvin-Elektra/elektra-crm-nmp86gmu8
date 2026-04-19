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
import { Plus, Trash2, Pencil } from 'lucide-react'
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

  const [editingSupplyId, setEditingSupplyId] = useState<string | null>(null)
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

    const payload = {
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
    }

    try {
      if (editingSupplyId) {
        await pb.collection('pv_supplies').update(editingSupplyId, payload)
        toast({ title: 'Sucesso', description: 'Insumo atualizado.' })
      } else {
        await pb.collection('pv_supplies').create(payload)
        toast({ title: 'Sucesso', description: 'Insumo adicionado.' })
      }
      setSupplyForm({ name: '', price: '', global: true, distributor_id: 'all' })
      setEditingSupplyId(null)
      loadData()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar o insumo.',
      })
    }
  }

  const handleEditSupply = (s: any) => {
    setSupplyForm({
      name: s.name,
      price: s.price.toString(),
      global: !s.distributor_id,
      distributor_id: s.distributor_id || 'all',
    })
    setEditingSupplyId(s.id)
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
              className="flex flex-col gap-4 bg-muted/30 p-5 rounded-xl border border-border/50"
            >
              <div className="flex items-center gap-2">
                <Switch
                  checked={supplyForm.global}
                  onCheckedChange={(c) => setSupplyForm({ ...supplyForm, global: c })}
                />
                <Label className="font-semibold">Aplicar a todos os distribuidores (Global)</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {!supplyForm.global && (
                  <div className="space-y-2">
                    <Label className="font-semibold">Distribuidor</Label>
                    <Select
                      value={supplyForm.distributor_id}
                      onValueChange={(v) => setSupplyForm({ ...supplyForm, distributor_id: v })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
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
                  <Label className="font-semibold">Nome do Insumo</Label>
                  <Input
                    required
                    placeholder="Ex: Cabo Solar 6mm"
                    value={supplyForm.name}
                    onChange={(e) => setSupplyForm({ ...supplyForm, name: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Valor Unitário (R$)</Label>
                  <Input
                    required
                    type="number"
                    step="0.01"
                    value={supplyForm.price}
                    onChange={(e) => setSupplyForm({ ...supplyForm, price: e.target.value })}
                    className="bg-background"
                  />
                </div>
                <div className="flex gap-2">
                  {editingSupplyId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingSupplyId(null)
                        setSupplyForm({ name: '', price: '', global: true, distributor_id: 'all' })
                      }}
                      className="w-full"
                    >
                      Cancelar
                    </Button>
                  )}
                  <Button type="submit" className="w-full">
                    {editingSupplyId ? (
                      'Salvar'
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" /> Adicionar
                      </>
                    )}
                  </Button>
                </div>
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
                    <tr key={d.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{d.name}</td>
                      <td className="p-3">
                        {d.expand?.distributor_id?.name ? (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {d.expand.distributor_id.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                            Global
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        R$ {d.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditSupply(d)}>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
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
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start bg-muted/30 p-5 rounded-xl border border-border/50"
            >
              <div className="space-y-2 md:col-span-2">
                <Label className="font-semibold">Insumo</Label>
                <Select
                  required
                  value={ruleForm.supply_id}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, supply_id: v })}
                >
                  <SelectTrigger className="bg-background">
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
                <Label className="font-semibold">Instalação Alvo</Label>
                <Select
                  value={ruleForm.installation_id}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, installation_id: v })}
                >
                  <SelectTrigger className="bg-background">
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
                <Label className="font-semibold">Base de Cálculo</Label>
                <Select
                  value={ruleForm.calc_base}
                  onValueChange={(v) => setRuleForm({ ...ruleForm, calc_base: v })}
                >
                  <SelectTrigger className="bg-background">
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
                <Label className="font-semibold">Multiplicador</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  value={ruleForm.multiplier}
                  onChange={(e) => setRuleForm({ ...ruleForm, multiplier: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="font-semibold">Aplicar na Faixa (De-Até)</Label>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <Select
                    value={ruleForm.range_type}
                    onValueChange={(v) => setRuleForm({ ...ruleForm, range_type: v })}
                  >
                    <SelectTrigger className="w-full sm:w-[160px] bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sempre aplicar</SelectItem>
                      <SelectItem value="modules">Módulos</SelectItem>
                      <SelectItem value="kwp">kWp</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex w-full gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      className="w-full bg-background"
                      disabled={ruleForm.range_type === 'none'}
                      value={ruleForm.min_val}
                      onChange={(e) => setRuleForm({ ...ruleForm, min_val: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      className="w-full bg-background"
                      disabled={ruleForm.range_type === 'none'}
                      value={ruleForm.max_val}
                      onChange={(e) => setRuleForm({ ...ruleForm, max_val: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="md:col-span-4 flex justify-end mt-2">
                <Button type="submit">
                  <Plus className="w-4 h-4 mr-2" /> Adicionar Regra
                </Button>
              </div>
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
                    <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
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
