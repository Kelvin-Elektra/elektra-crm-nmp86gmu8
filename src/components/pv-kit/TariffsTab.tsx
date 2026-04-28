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
import { HelpCircle, Trash2, Edit2, Check, ChevronsUpDown, Plus } from 'lucide-react'
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
  { s: 'AM', n: 'Amazonas Energia' },
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

  const [distributors, setDistributors] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])

  // Tab 1: Concessionárias
  const [distName, setDistName] = useState('')
  const [searchDist, setSearchDist] = useState('')
  const [openDistCombobox, setOpenDistCombobox] = useState(false)
  const [deleteDistId, setDeleteDistId] = useState<string | null>(null)

  // Tab 3: Form for Rules creation
  const [ruleForm, setRuleForm] = useState({
    distributor_id: '',
    network_type: 'Monofásico',
    voltage: '127V',
    classes: [] as string[],
    te: '',
    tusd: '',
    icms_exemption: 'none',
  })

  // Edit/Delete modals
  const [editNetworkRule, setEditNetworkRule] = useState<any>(null)
  const [editTariffRule, setEditTariffRule] = useState<any>(null)
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)

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
    if (user?.company_id) loadData()
  }, [user?.company_id])

  // --- Handlers for Tab 1: Concessionárias ---
  const handleAddDistributor = async () => {
    if (!distName) return toast({ variant: 'destructive', title: 'Nome inválido' })
    try {
      await pb
        .collection('pv_distributors')
        .create({ name: distName, company_id: user?.company_id })
      toast({ title: 'Sucesso', description: 'Concessionária adicionada.' })
      setDistName('')
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  const handleDeleteDist = async (id: string) => {
    try {
      await pb.collection('pv_distributors').delete(id)
      toast({ title: 'Sucesso', description: 'Concessionária excluída.' })
      setDeleteDistId(null)
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  // --- Handlers for Tab 2: Configuração de Rede ---
  const handleUpdateNetwork = async () => {
    try {
      await pb.collection('pv_tariff_rules').update(editNetworkRule.id, {
        network_type: editNetworkRule.network_type,
        voltage: editNetworkRule.voltage,
      })
      toast({ title: 'Sucesso', description: 'Configuração de rede atualizada.' })
      setEditNetworkRule(null)
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  // --- Handlers for Tab 3: Classes e Tarifas ---
  const handleCreateRule = async () => {
    if (
      !ruleForm.distributor_id ||
      ruleForm.classes.length === 0 ||
      !ruleForm.te ||
      !ruleForm.tusd
    ) {
      return toast({ variant: 'destructive', title: 'Preencha todos os campos obrigatórios' })
    }
    try {
      for (const cls of ruleForm.classes) {
        await pb.collection('pv_tariff_rules').create({
          company_id: user?.company_id,
          distributor_id: ruleForm.distributor_id,
          class: cls,
          network_type: ruleForm.network_type,
          voltage: ruleForm.voltage,
          te: Number(ruleForm.te),
          tusd: Number(ruleForm.tusd),
          icms_exemption: ruleForm.icms_exemption,
        })
      }
      toast({ title: 'Sucesso', description: 'Regras tarifárias cadastradas com sucesso.' })
      setRuleForm({ ...ruleForm, classes: [], te: '', tusd: '' })
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message })
    }
  }

  const handleUpdateTariff = async () => {
    try {
      await pb.collection('pv_tariff_rules').update(editTariffRule.id, {
        class: editTariffRule.class,
        te: Number(editTariffRule.te),
        tusd: Number(editTariffRule.tusd),
        icms_exemption: editTariffRule.icms_exemption,
      })
      toast({ title: 'Sucesso', description: 'Tarifas atualizadas.' })
      setEditTariffRule(null)
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  const handleDeleteRule = async (id: string) => {
    try {
      await pb.collection('pv_tariff_rules').delete(id)
      toast({ title: 'Sucesso', description: 'Regra excluída.' })
      setDeleteRuleId(null)
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="concessionarias" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="concessionarias">Concessionárias</TabsTrigger>
          <TabsTrigger value="rede">Configuração de Rede</TabsTrigger>
          <TabsTrigger value="tarifas">Classes e Tarifas</TabsTrigger>
        </TabsList>

        {/* Tab 1: Concessionárias */}
        <TabsContent value="concessionarias" className="space-y-6 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle>Concessionárias Habilitadas</CardTitle>
              <CardDescription>
                Cadastre as empresas de energia com as quais você opera.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row items-end gap-4 bg-muted/30 p-4 rounded-lg">
                <div className="w-full max-w-sm space-y-2">
                  <Label>Nome da Concessionária</Label>
                  <Popover open={openDistCombobox} onOpenChange={setOpenDistCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between bg-background"
                      >
                        {distName || 'Selecione ou digite...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Buscar concessionária..."
                          onValueChange={setSearchDist}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-sm"
                              onClick={() => {
                                setDistName(searchDist)
                                setOpenDistCombobox(false)
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
                                      setDistName(u.n)
                                      setOpenDistCombobox(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        distName === u.n ? 'opacity-100' : 'opacity-0',
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
                <Button onClick={handleAddDistributor} disabled={!distName}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar
                </Button>
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributors.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setDeleteDistId(d.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {distributors.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-6 text-muted-foreground">
                          Nenhuma concessionária cadastrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Configuração de Rede */}
        <TabsContent value="rede" className="space-y-6 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle>Gestão de Conexões</CardTitle>
              <CardDescription>
                Visualize e gerencie os tipos de conexão e tensão das regras tarifárias.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Concessionária</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>Tipo de Conexão</TableHead>
                      <TableHead>Tensão</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.expand?.distributor_id?.name}
                        </TableCell>
                        <TableCell>{r.class}</TableCell>
                        <TableCell>{r.network_type}</TableCell>
                        <TableCell>{r.voltage}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditNetworkRule({ ...r })}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                          Nenhuma regra tarifária encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Classes e Tarifas */}
        <TabsContent value="tarifas" className="space-y-6 animate-fade-in">
          <Card>
            <CardHeader>
              <CardTitle>Nova Regra Tarifária</CardTitle>
              <CardDescription>
                Configure em lote as tarifas e isenções aplicadas a diferentes classes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-muted/20 p-5 rounded-lg border border-border/50">
                <div className="space-y-2">
                  <Label>Concessionária</Label>
                  <Select
                    value={ruleForm.distributor_id}
                    onValueChange={(v) => setRuleForm({ ...ruleForm, distributor_id: v })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione..." />
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
                  <Label>Tipo de Conexão</Label>
                  <Select
                    value={ruleForm.network_type}
                    onValueChange={(v) => setRuleForm({ ...ruleForm, network_type: v })}
                  >
                    <SelectTrigger className="bg-background">
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
                    value={ruleForm.voltage}
                    onValueChange={(v) => setRuleForm({ ...ruleForm, voltage: v })}
                  >
                    <SelectTrigger className="bg-background">
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
                <div className="space-y-3 md:col-span-3">
                  <Label>Classes de Consumo (Aplicação em Lote)</Label>
                  <div className="flex flex-wrap gap-4 p-4 border rounded-lg bg-background">
                    {CLASSES.map((cls) => (
                      <div key={cls} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cls-${cls}`}
                          checked={ruleForm.classes.includes(cls)}
                          onCheckedChange={(c) =>
                            setRuleForm({
                              ...ruleForm,
                              classes: c
                                ? [...ruleForm.classes, cls]
                                : ruleForm.classes.filter((x) => x !== cls),
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
                <div className="space-y-2">
                  <Label>Tarifa de Energia (TE)</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="Ex: 0.36000"
                    className="bg-background"
                    value={ruleForm.te}
                    onChange={(e) => setRuleForm({ ...ruleForm, te: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tarifa de Uso (TUSD)</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    placeholder="Ex: 0.48000"
                    className="bg-background"
                    value={ruleForm.tusd}
                    onChange={(e) => setRuleForm({ ...ruleForm, tusd: e.target.value })}
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
                    value={ruleForm.icms_exemption}
                    onValueChange={(v) => setRuleForm({ ...ruleForm, icms_exemption: v })}
                  >
                    <SelectTrigger className="bg-background">
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
                <div className="md:col-span-3 flex justify-end">
                  <Button onClick={handleCreateRule}>Vincular Tarifas</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regras de Classes e Tarifas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Concessionária</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead>TE</TableHead>
                      <TableHead>TUSD</TableHead>
                      <TableHead>Isenção</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {r.expand?.distributor_id?.name}
                        </TableCell>
                        <TableCell>{r.class}</TableCell>
                        <TableCell>{r.te}</TableCell>
                        <TableCell>{r.tusd}</TableCell>
                        <TableCell className="capitalize">{r.icms_exemption}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditTariffRule({ ...r })}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteRuleId(r.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {rules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          Nenhuma regra tarifária encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Network Modal */}
      <Dialog open={!!editNetworkRule} onOpenChange={(o) => !o && setEditNetworkRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Rede ({editNetworkRule?.class})</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Conexão</Label>
              <Select
                value={editNetworkRule?.network_type}
                onValueChange={(v) => setEditNetworkRule({ ...editNetworkRule, network_type: v })}
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
                value={editNetworkRule?.voltage}
                onValueChange={(v) => setEditNetworkRule({ ...editNetworkRule, voltage: v })}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditNetworkRule(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateNetwork}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tariffs Modal */}
      <Dialog open={!!editTariffRule} onOpenChange={(o) => !o && setEditTariffRule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tarifa ({editTariffRule?.class})</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Classe de Consumo</Label>
              <Select
                value={editTariffRule?.class}
                onValueChange={(v) => setEditTariffRule({ ...editTariffRule, class: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>TE</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={editTariffRule?.te || ''}
                  onChange={(e) => setEditTariffRule({ ...editTariffRule, te: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>TUSD</Label>
                <Input
                  type="number"
                  step="0.00001"
                  value={editTariffRule?.tusd || ''}
                  onChange={(e) => setEditTariffRule({ ...editTariffRule, tusd: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Isenção ICMS</Label>
              <Select
                value={editTariffRule?.icms_exemption}
                onValueChange={(v) => setEditTariffRule({ ...editTariffRule, icms_exemption: v })}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTariffRule(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateTariff}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Confirmation Modal */}
      <Dialog open={!!deleteRuleId} onOpenChange={(o) => !o && setDeleteRuleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deseja realmente excluir esta regra tarifária? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRuleId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteRuleId && handleDeleteRule(deleteRuleId)}
            >
              Excluir Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Distributor Confirmation Modal */}
      <Dialog open={!!deleteDistId} onOpenChange={(o) => !o && setDeleteDistId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deseja realmente excluir esta concessionária? Regras associadas poderão ser afetadas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDistId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDistId && handleDeleteDist(deleteDistId)}
            >
              Excluir Concessionária
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
