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
import { Plus, Trash2, Settings2, Pencil, Wand2 } from 'lucide-react'
import { TaxWeightTooltip } from '@/components/pv-kit/TaxWeightTooltip'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useRealtime } from '@/hooks/use-realtime'

export function CostsTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [installations, setInstallations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [billingModel, setBillingModel] = useState('direct')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const initialForm = {
    name: '',
    range_type: 'none',
    calc_method: 'fixed',
    value: '',
    min_val: '',
    max_val: '',
    installation_id: 'none',
    calc_base: 'fixed',
    multiplier: '',
    user_id: 'all',
    is_real_margin: false,
    tax_weight: '100',
  }
  const [form, setForm] = useState(initialForm)

  const hasMargin = data.some((d) => d.calc_method === 'margin')
  const hasKitPercent = data.some((d) => d.calc_method === 'kit_percent')

  const standardCostTemplates = [
    { name: 'Comissão de venda', calc_method: 'commission', value: 5 },
    { name: 'Mão de obra', calc_method: 'fixed', value: 3000 },
    { name: 'Engenharia', calc_method: 'fixed', value: 1500 },
    {
      name: 'Material complementar',
      calc_method: 'variable',
      calc_base: 'modules',
      multiplier: 50,
    },
    { name: 'Imposto', calc_method: 'tax', value: 7 },
    { name: 'Margem de contribuição', calc_method: 'margin', value: 25 },
  ]

  const methodLabels: Record<string, string> = {
    fixed: 'Valor fixo',
    variable: 'Valor variável',
    rate: 'Percentual sobre a venda',
    tax: 'Imposto',
    margin: 'Margem real (% sobre o valor da venda)',
    kit_percent: 'Margem fake (% sobre o preço do kit)',
    commission: 'Comissão (% sobre o valor da venda)',
  }

  const handleNumberChange = (field: string, value: string) => {
    let clean = value.replace(/[^0-9,.-]/g, '')
    const parts = clean.split(',')
    if (parts.length > 2) {
      clean = parts[0] + ',' + parts.slice(1).join('')
    }
    setForm({ ...form, [field]: clean })
  }

  const parseNumber = (val: string) => (val ? Number(val.replace(',', '.')) : null)
  const formatNumber = (val: number | string | null | undefined) =>
    val !== null && val !== undefined ? val.toString().replace('.', ',') : ''

  const loadData = async () => {
    if (!user?.company_id) return
    setLoading(true)
    try {
      const res = await pb
        .collection('pv_costs')
        .getFullList({ filter: `company_id='${user.company_id}'` })
      setData(res)
      const inst = await pb
        .collection('pv_installations')
        .getFullList({ filter: `company_id='${user.company_id}'` })
      setInstallations(inst)

      const usr = await pb
        .collection('users')
        .getFullList({ filter: `company_id='${user.company_id}' && status='active'` })
      setUsers(usr)

      try {
        const settings = await pb
          .collection('proposal_settings')
          .getFirstListItem(`company_id = '${user.company_id}'`)
        if (settings) {
          setSettingsId(settings.id)
          if (settings.billing_model) setBillingModel(settings.billing_model)
        }
      } catch {
        /* intentionally ignored */
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  useRealtime('pv_costs', () => {
    loadData()
  })

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

    const marginMethods = ['margin', 'kit_percent']
    if (marginMethods.includes(form.calc_method) && !editingId) {
      const existing = data.find((d) => marginMethods.includes(d.calc_method))
      if (existing) {
        toast({
          variant: 'destructive',
          title: 'Margem já configurada',
          description: `Já existe um custo do tipo "${existing.calc_method === 'margin' ? 'Margem Real' : 'Margem Fake'}". Apenas um tipo de margem pode estar ativo por empresa.`,
        })
        return
      }
    }

    if (marginMethods.includes(form.calc_method) && editingId) {
      const existing = data.find((d) => marginMethods.includes(d.calc_method) && d.id !== editingId)
      if (existing) {
        toast({
          variant: 'destructive',
          title: 'Margem já configurada',
          description:
            'Já existe outro custo do tipo margem. Apenas um tipo de margem pode estar ativo por empresa.',
        })
        return
      }
    }

    const payload = {
      name: form.name,
      calc_method: form.calc_method,
      value: form.calc_method === 'variable' ? null : (parseNumber(form.value) ?? 0),
      range_type: form.range_type,
      min_val: form.range_type !== 'none' && form.min_val ? parseNumber(form.min_val) : null,
      max_val: form.range_type !== 'none' && form.max_val ? parseNumber(form.max_val) : null,
      installation_id: form.installation_id !== 'none' ? form.installation_id : null,
      calc_base:
        form.calc_method === 'variable' && form.calc_base === 'fixed' ? 'modules' : form.calc_base,
      multiplier: parseNumber(form.multiplier) || null,
      user_id: form.user_id !== 'all' ? form.user_id : null,
      is_real_margin: form.calc_method === 'margin',
      tax_weight: form.calc_method === 'tax' ? (parseNumber(form.tax_weight) ?? 100) : null,
      company_id: user.company_id,
    }

    try {
      if (editingId) {
        await pb.collection('pv_costs').update(editingId, payload)
        toast({ title: 'Sucesso', description: 'Custo/Imposto atualizado.' })
      } else {
        await pb.collection('pv_costs').create(payload)
        toast({ title: 'Sucesso', description: 'Custo/Imposto adicionado.' })
      }
      const taxCosts = await pb
        .collection('pv_costs')
        .getFullList({ filter: `company_id='${user.company_id}' && calc_method='tax'` })
      const totalWeight = taxCosts.reduce(
        (sum: number, c: any) => sum + (Number(c.tax_weight) || 0),
        0,
      )
      if (taxCosts.length > 0 && totalWeight !== 100) {
        toast({
          title: 'Atenção: Pesos dos Impostos',
          description: `O sistema recomenda revisar os pesos para que o imposto da venda seja aplicado corretamente (Total atual: ${totalWeight}%).`,
        })
      }
      resetForm()
      loadData()
    } catch (err: any) {
      const msg = err?.response?.message || 'Falha ao salvar.'
      toast({ variant: 'destructive', title: 'Erro', description: msg })
    }
  }

  const handleEdit = (item: any) => {
    const safeCalcBase =
      item.calc_method === 'variable' && (item.calc_base === 'fixed' || !item.calc_base)
        ? 'modules'
        : item.calc_base || 'fixed'
    setForm({
      name: item.name,
      range_type: item.range_type,
      calc_method: item.calc_method,
      value: formatNumber(item.value),
      min_val: formatNumber(item.min_val),
      max_val: formatNumber(item.max_val),
      installation_id: item.installation_id || 'none',
      calc_base: safeCalcBase,
      multiplier: formatNumber(item.multiplier),
      user_id: item.user_id || 'all',
      is_real_margin: item.is_real_margin || false,
      tax_weight: formatNumber(item.tax_weight || 100),
    })
    setEditingId(item.id)
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('pv_costs').delete(id)
      toast({ title: 'Sucesso', description: 'Removido com sucesso.' })
      loadData()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao remover.' })
    }
  }

  const resetForm = () => {
    setForm(initialForm)
    setEditingId(null)
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
                O distribuidor fatura o kit e minha empresa fatura a diferença
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
            className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start bg-muted/30 p-5 rounded-xl border border-border/50"
          >
            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold">Nome do Custo/Imposto</Label>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-background"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="text-xs mt-1">
                    <Wand2 className="w-3 h-3 mr-1" /> Buscar Sugestões
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="start">
                  <div className="space-y-1">
                    <p className="text-sm font-medium mb-2">Modelos Padrão</p>
                    {standardCostTemplates.map((t) => (
                      <button
                        type="button"
                        key={t.name}
                        onClick={() =>
                          setForm({
                            ...form,
                            name: t.name,
                            calc_method: t.calc_method,
                            value: t.value ? formatNumber(t.value) : '',
                            calc_base:
                              t.calc_base || (t.calc_method === 'variable' ? 'modules' : 'fixed'),
                            multiplier: t.multiplier ? formatNumber(t.multiplier) : '',
                          })
                        }
                        className="w-full text-left text-sm px-3 py-2 rounded-md hover:bg-muted transition-colors border"
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {methodLabels[t.calc_method]}
                        </span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold">Método de Cálculo</Label>
              <Select
                value={form.calc_method}
                onValueChange={(v) => {
                  if (v === 'variable' && (form.calc_base === 'fixed' || !form.calc_base)) {
                    setForm({ ...form, calc_method: v, calc_base: 'modules' })
                  } else if (v !== 'variable') {
                    setForm({ ...form, calc_method: v, calc_base: 'fixed' })
                  } else {
                    setForm({ ...form, calc_method: v })
                  }
                }}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  <SelectItem value="variable">Valor variável (R$)</SelectItem>
                  <SelectItem value="rate">Percentual sobre o valor da venda (%)</SelectItem>
                  <SelectItem value="tax">Imposto (%)</SelectItem>
                  <SelectItem value="margin" disabled={hasKitPercent}>
                    Margem real (% sobre o valor da venda)
                    {hasKitPercent ? ' (bloqueado: margem fake ativa)' : ''}
                  </SelectItem>
                  <SelectItem value="kit_percent" disabled={hasMargin}>
                    Margem fake (% sobre o preço do kit)
                    {hasMargin ? ' (bloqueado: margem real ativa)' : ''}
                  </SelectItem>
                  <SelectItem value="commission">Comissão (% sobre o valor da venda)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.calc_method !== 'variable' && (
              <div className="space-y-2 md:col-span-2">
                <Label className="font-semibold">
                  {form.calc_method === 'fixed' ? 'Valor (R$)' : 'Valor (%)'}
                </Label>
                <Input
                  required
                  type="text"
                  value={form.value}
                  onChange={(e) => handleNumberChange('value', e.target.value)}
                  className="bg-background"
                />
              </div>
            )}

            {form.calc_method === 'variable' && (
              <>
                <div className="space-y-2 md:col-span-3">
                  <Label className="font-semibold">
                    Base de Cálculo Variável <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.calc_base}
                    onValueChange={(v) => setForm({ ...form, calc_base: v })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modules">Quantidade de Módulos</SelectItem>
                      <SelectItem value="kwp">Potência (kWp)</SelectItem>
                      <SelectItem value="kw">Potência do Inversor (kW)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Define a base do cálculo: Multiplicador × Base = Custo Final.
                  </p>
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label className="font-semibold">
                    Multiplicador <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    required
                    type="text"
                    value={form.multiplier}
                    onChange={(e) => handleNumberChange('multiplier', e.target.value)}
                    className="bg-background"
                    placeholder="Ex: 150,00"
                  />
                  <p className="text-xs text-muted-foreground">
                    Valor unitário aplicado sobre a base de cálculo selecionada.
                  </p>
                </div>
              </>
            )}

            <div className="space-y-2 md:col-span-3">
              <Label className="font-semibold">Condição (Faixa de Aplicação)</Label>
              <Select
                value={form.range_type}
                onValueChange={(v) => setForm({ ...form, range_type: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sempre aplicar (Geral)</SelectItem>
                  <SelectItem value="modules">Qtde. de Módulos</SelectItem>
                  <SelectItem value="kwp">Potência Total (kWp)</SelectItem>
                  <SelectItem value="kw">Potência do Inversor (kW)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.range_type !== 'none' && (
              <div className="space-y-2 md:col-span-3 flex items-end gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Mínimo</Label>
                  <Input
                    type="text"
                    value={form.min_val}
                    onChange={(e) => handleNumberChange('min_val', e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Máximo</Label>
                  <Input
                    type="text"
                    value={form.max_val}
                    onChange={(e) => handleNumberChange('max_val', e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 md:col-span-3">
              <Label className="font-semibold">Tipo de Instalação Específica (Opcional)</Label>
              <Select
                value={form.installation_id}
                onValueChange={(v) => setForm({ ...form, installation_id: v })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todas as Instalações</SelectItem>
                  {installations.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label className="font-semibold">Colaborador</Label>
              <Select value={form.user_id} onValueChange={(v) => setForm({ ...form, user_id: v })}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os colaboradores</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.calc_method === 'tax' && (
              <div className="space-y-2 md:col-span-6">
                <div className="flex items-center gap-2">
                  <Label className="font-semibold">Peso do Imposto (%)</Label>
                  <TaxWeightTooltip />
                </div>
                <Input
                  type="text"
                  value={form.tax_weight}
                  onChange={(e) => handleNumberChange('tax_weight', e.target.value)}
                  className="bg-background"
                  placeholder="Ex: 100"
                />
                <p className="text-xs text-muted-foreground">
                  Define o peso de incidência deste imposto. A soma dos pesos de todos os impostos
                  deve totalizar 100% para o cálculo correto.
                </p>
              </div>
            )}

            <div className="md:col-span-6 flex justify-end gap-2 mt-2">
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              )}
              <Button type="submit">
                {editingId ? (
                  'Salvar Alterações'
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" /> Salvar Regra
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 font-medium">Nome</th>
                  <th className="p-3 font-medium">Método</th>
                  <th className="p-3 font-medium">Valor / %</th>
                  <th className="p-3 font-medium">Faixa / Condição</th>
                  <th className="p-3 font-medium">Margem</th>
                  <th className="p-3 font-medium">Colaborador</th>
                  <th className="p-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-t">
                      <td colSpan={7} className="p-3">
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      Nenhuma regra de custo configurada.
                    </td>
                  </tr>
                ) : (
                  data.map((d) => (
                    <tr key={d.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-medium">{d.name}</td>
                      <td className="p-3">{methodLabels[d.calc_method] || d.calc_method}</td>
                      <td className="p-3 font-medium">
                        {d.calc_method === 'variable' ? (
                          <span className="text-muted-foreground text-xs">
                            {formatNumber(d.multiplier)} ×{' '}
                            {d.calc_base === 'modules'
                              ? 'módulos'
                              : d.calc_base === 'kwp'
                                ? 'kWp'
                                : d.calc_base === 'kw'
                                  ? 'kW'
                                  : d.calc_base}
                          </span>
                        ) : (
                          <>
                            {d.calc_method === 'fixed' ? 'R$ ' : ''}
                            {formatNumber(d.value)}
                            {['rate', 'tax', 'margin', 'kit_percent', 'commission'].includes(
                              d.calc_method,
                            )
                              ? '%'
                              : ''}
                            {d.calc_method === 'tax' && d.tax_weight != null && (
                              <span className="text-muted-foreground text-xs ml-1">
                                (Peso: {formatNumber(d.tax_weight)}%)
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="p-3 capitalize text-muted-foreground">
                        {d.range_type === 'none'
                          ? 'Geral'
                          : `${d.range_type} (${d.min_val || 0}-${d.max_val || '∞'})`}
                        {d.installation_id ? ` • Inst. Específica` : ''}
                      </td>
                      <td className="p-3">
                        {d.is_real_margin ? (
                          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                            Margem Real
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {d.user_id
                          ? users.find((u) => u.id === d.user_id)?.name || 'Colaborador'
                          : 'Todos'}
                      </td>
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
    </div>
  )
}
