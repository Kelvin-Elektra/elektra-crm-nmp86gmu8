import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
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
import {
  HelpCircle,
  Trash2,
  Edit2,
  Check,
  ChevronsUpDown,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  const [activeStep, setActiveStep] = useState('step1')

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
      toast({ title: 'Sucesso', description: 'Regras tarifárias salvas em lote.' })
      setForm({ ...form, classes: [], te: '', tusd: '' })
      setActiveStep('step1')
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message })
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
      toast({ title: 'Sucesso', description: 'Regra tarifária atualizada.' })
      setEditRule(null)
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta regra tarifária?')) return
    try {
      await pb.collection('pv_tariff_rules').delete(id)
      toast({ title: 'Sucesso', description: 'Regra excluída.' })
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-lg font-medium">Nova Regra Tarifária</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Siga as 3 etapas para configurar regras de energia em lote.
          </p>
        </div>
        <Tabs value={activeStep} onValueChange={setActiveStep} className="w-full">
          <div className="px-6 border-b">
            <TabsList className="grid w-full grid-cols-3 h-12 bg-transparent">
              <TabsTrigger
                value="step1"
                className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none"
              >
                1. Concessionária
              </TabsTrigger>
              <TabsTrigger
                value="step2"
                disabled={!form.distributor_name}
                className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none"
              >
                2. Conexão e Tensão
              </TabsTrigger>
              <TabsTrigger
                value="step3"
                disabled={!form.distributor_name}
                className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none shadow-none"
              >
                3. Classes e Tarifas
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="step1" className="mt-0 space-y-4 animate-fade-in">
              <div className="space-y-2 max-w-md">
                <Label>Habilitar Concessionária</Label>
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
              <div className="pt-4 flex justify-end">
                <Button
                  onClick={() => {
                    if (!form.distributor_name)
                      return toast({
                        variant: 'destructive',
                        title: 'Selecione uma concessionária',
                      })
                    setActiveStep('step2')
                  }}
                >
                  Próximo Passo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="step2" className="mt-0 space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                <div className="space-y-2">
                  <Label>Tipo de Conexão</Label>
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
                  <Label>Tensão da Rede</Label>
                  <Select
                    value={form.voltage}
                    onValueChange={(v) => setForm({ ...form, voltage: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="127V">127V</SelectItem>
                      <SelectItem value="220V">220V</SelectItem>
                      <SelectItem value="127-220V">127-220V</SelectItem>
                      <SelectItem value="220-380V">220-380V</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep('step1')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={() => setActiveStep('step3')}>
                  Próximo Passo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="step3" className="mt-0 space-y-6 animate-fade-in">
              <div className="space-y-3">
                <Label className="text-base">Classes de Consumo (Aplicação em Lote)</Label>
                <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-muted/30">
                  {CLASSES.map((cls) => (
                    <div key={cls} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cls-${cls}`}
                        checked={form.classes.includes(cls)}
                        onCheckedChange={(c) =>
                          setForm({
                            ...form,
                            classes: c
                              ? [...form.classes, cls]
                              : form.classes.filter((x) => x !== cls),
                          })
                        }
                      />
                      <Label htmlFor={`cls-${cls}`} className="cursor-pointer">
                        {cls}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                          <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
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
              <div className="pt-4 flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep('step2')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button onClick={handleSave}>Salvar Configuração</Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regras Configuradas</CardTitle>
          <CardDescription>Gerencie as tarifas cadastradas no sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
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
                    <TableCell className="font-medium">{r.expand?.distributor_id?.name}</TableCell>
                    <TableCell>{r.class}</TableCell>
                    <TableCell>
                      {r.network_type} <span className="text-muted-foreground">({r.voltage})</span>
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
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Conexão</Label>
                  <Select
                    value={editRule.network_type}
                    onValueChange={(v) => setEditRule({ ...editRule, network_type: v })}
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
                  <Select
                    value={editRule.voltage}
                    onValueChange={(v) => setEditRule({ ...editRule, voltage: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="127V">127V</SelectItem>
                      <SelectItem value="220V">220V</SelectItem>
                      <SelectItem value="127-220V">127-220V</SelectItem>
                      <SelectItem value="220-380V">220-380V</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setEditRule(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdate}>Salvar Alterações</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
