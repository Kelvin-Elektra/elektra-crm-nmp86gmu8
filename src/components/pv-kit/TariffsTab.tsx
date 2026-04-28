import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { HelpCircle, Trash2, Edit2, Check, ChevronsUpDown } from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const UTILITIES = [
  { s: 'AC', n: 'Energisa Acre' },
  { s: 'AL', n: 'Equatorial Alagoas' },
  { s: 'AM', n: 'Amazonina Energia' },
  { s: 'AP', n: 'Equatorial Amapá' },
  { s: 'BA', n: 'Neoenergia Coelba' },
  { s: 'CE', n: 'Enel Ceará' },
  { s: 'DF', n: 'Neoenergia Brasília' },
  { s: 'ES', n: 'EDP Espírito Santo' },
  { s: 'GO', n: 'Enel Goiás' },
  { s: 'MA', n: 'Equatorial Maranhão' },
  { s: 'MT', n: 'ENERGISA MT' },
  { s: 'MS', n: 'Energisa MS' },
  { s: 'MG', n: 'Cemig' },
  { s: 'PA', n: 'Equatorial Pará' },
  { s: 'PB', n: 'Energisa Paraíba' },
  { s: 'PR', n: 'Copel' },
  { s: 'PE', n: 'Neoenergia Pernambuco' },
  { s: 'PI', n: 'Equatorial Piauí' },
  { s: 'RJ', n: 'Light' },
  { s: 'RN', n: 'Neoenergia Cosern' },
  { s: 'RO', n: 'Energisa Rondônia' },
  { s: 'RR', n: 'Amapá Energia' },
  { s: 'SC', n: 'Celesc' },
  { s: 'SP', n: 'Enel SP' },
  { s: 'SP', n: 'CPFL Paulista' },
  { s: 'SP', n: 'CPFL Piratininga' },
  { s: 'SE', n: 'Energisa Sergipe' },
  { s: 'TO', n: 'Energisa Tocantins' },
]
const STATES = Array.from(new Set(UTILITIES.map((u) => u.s))).sort()
const CLASSES = ['Residencial', 'Comercial', 'Industrial', 'Rural', 'Outros']

export function TariffsTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [rules, setRules] = useState<any[]>([])
  const [distributors, setDistributors] = useState<any[]>([])
  const [openCombobox, setOpenCombobox] = useState(false)
  const [searchDist, setSearchDist] = useState('')

  const [form, setForm] = useState({
    distributor_name: '',
    network_type: 'Monofásico',
    voltage: '127V',
    classes: [] as string[],
    te: '',
    tusd: '',
    icms_exemption: 'none',
  })

  const [editRule, setEditRule] = useState<any>(null)

  const loadData = async () => {
    try {
      const [distRes, rulesRes] = await Promise.all([
        pb
          .collection('pv_distributors')
          .getFullList({ filter: `company_id='${user?.company_id}'` }),
        pb
          .collection('pv_tariff_rules')
          .getFullList({ filter: `company_id='${user?.company_id}'`, expand: 'distributor_id' }),
      ])
      setDistributors(distRes)
      setRules(rulesRes)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.company_id])

  const handleSave = async () => {
    if (!form.distributor_name || form.classes.length === 0 || !form.te || !form.tusd) {
      return toast({ variant: 'destructive', title: 'Preencha todos os campos obrigatórios' })
    }
    try {
      let dist = distributors.find(
        (d) => d.name.toLowerCase() === form.distributor_name.toLowerCase(),
      )
      if (!dist) {
        dist = await pb
          .collection('pv_distributors')
          .create({ name: form.distributor_name, company_id: user?.company_id })
      }
      for (const cls of form.classes) {
        await pb.collection('pv_tariff_rules').create({
          company_id: user?.company_id,
          distributor_id: dist.id,
          class: cls,
          network_type: form.network_type,
          voltage: form.voltage,
          te: Number(form.te),
          tusd: Number(form.tusd),
          icms_exemption: form.icms_exemption,
        })
      }
      toast({ title: 'Sucesso', description: 'Regras tarifárias salvas.' })
      setForm({ ...form, classes: [], te: '', tusd: '' })
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  const handleUpdate = async () => {
    if (!editRule) return
    try {
      await pb.collection('pv_tariff_rules').update(editRule.id, {
        network_type: editRule.network_type,
        voltage: editRule.voltage,
        te: Number(editRule.te),
        tusd: Number(editRule.tusd),
        icms_exemption: editRule.icms_exemption,
      })
      toast({ title: 'Sucesso', description: 'Regra atualizada.' })
      setEditRule(null)
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta regra?')) return
    await pb.collection('pv_tariff_rules').delete(id)
    loadData()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova Configuração Tarifária</CardTitle>
          <CardDescription>
            Defina tarifas em lote selecionando múltiplas classes de consumo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Concessionária</Label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {form.distributor_name || 'Selecione ou digite...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Buscar concessionária..."
                      onValueChange={setSearchDist}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <Button
                          variant="ghost"
                          className="w-full justify-start px-2 py-1.5 text-sm"
                          onClick={() => {
                            setForm({ ...form, distributor_name: searchDist })
                            setOpenCombobox(false)
                          }}
                        >
                          Criar "{searchDist}"
                        </Button>
                      </CommandEmpty>
                      {STATES.map((state) => {
                        const group = UTILITIES.filter((u) => u.s === state)
                        if (!group.length) return null
                        return (
                          <CommandGroup key={state} heading={state}>
                            {group.map((u) => (
                              <CommandItem
                                key={u.n}
                                onSelect={() => {
                                  setForm({ ...form, distributor_name: u.n })
                                  setOpenCombobox(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    form.distributor_name === u.n ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {u.n}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )
                      })}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Conexão</Label>
              <Select
                value={form.network_type}
                onValueChange={(v) => setForm({ ...form, network_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monofásico">Monofásico</SelectItem>
                  <SelectItem value="Bifásico">Bifásico</SelectItem>
                  <SelectItem value="Trifásico">Trifásico</SelectItem>
                  <SelectItem value="Monofásico rural">Monofásico rural</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tensão</Label>
              <Select value={form.voltage} onValueChange={(v) => setForm({ ...form, voltage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="127V">127V</SelectItem>
                  <SelectItem value="127-220V">127-220V</SelectItem>
                  <SelectItem value="220-380V">220-380V</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Classes de Consumo (Aplicação em Lote)</Label>
            <div className="flex flex-wrap gap-4 p-4 border rounded-md bg-muted/20">
              {CLASSES.map((cls) => (
                <div key={cls} className="flex items-center space-x-2">
                  <Checkbox
                    id={`cls-${cls}`}
                    checked={form.classes.includes(cls)}
                    onCheckedChange={(c) =>
                      setForm({
                        ...form,
                        classes: c ? [...form.classes, cls] : form.classes.filter((x) => x !== cls),
                      })
                    }
                  />
                  <Label htmlFor={`cls-${cls}`}>{cls}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tarifa de Energia (TE)</Label>
              <Input
                type="number"
                step="0.00001"
                placeholder="Ex: 0.36000"
                value={form.te}
                onChange={(e) => setForm({ ...form, te: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tarifa de Uso (TUSD)</Label>
              <Input
                type="number"
                step="0.00001"
                placeholder="Ex: 0.48000"
                value={form.tusd}
                onChange={(e) => setForm({ ...form, tusd: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Isenção de ICMS</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger type="button">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Defina se há isenção de ICMS aplicado sobre a energia compensada</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={form.icms_exemption}
                onValueChange={(v) => setForm({ ...form, icms_exemption: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="te">Apenas TE</SelectItem>
                  <SelectItem value="tusd">Apenas TUSD</SelectItem>
                  <SelectItem value="both">Ambas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} className="mt-4">
            Salvar Regras
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras Existentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concessionária</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>Conexão</TableHead>
                  <TableHead>TE</TableHead>
                  <TableHead>TUSD</TableHead>
                  <TableHead>Isenção</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.expand?.distributor_id?.name}</TableCell>
                    <TableCell>{r.class}</TableCell>
                    <TableCell>
                      {r.network_type} ({r.voltage})
                    </TableCell>
                    <TableCell>{r.te}</TableCell>
                    <TableCell>{r.tusd}</TableCell>
                    <TableCell className="capitalize">{r.icms_exemption}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setEditRule(r)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                      Nenhuma regra tarifária configurada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editRule} onOpenChange={(o) => !o && setEditRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Regra ({editRule?.class})</DialogTitle>
          </DialogHeader>
          {editRule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>TE</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={editRule.te}
                    onChange={(e) => setEditRule({ ...editRule, te: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>TUSD</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={editRule.tusd}
                    onChange={(e) => setEditRule({ ...editRule, tusd: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Isenção ICMS</Label>
                <Select
                  value={editRule.icms_exemption}
                  onValueChange={(v) => setEditRule({ ...editRule, icms_exemption: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    <SelectItem value="te">Apenas TE</SelectItem>
                    <SelectItem value="tusd">Apenas TUSD</SelectItem>
                    <SelectItem value="both">Ambas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdate} className="w-full">
                Salvar Alterações
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
