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

  const [utilities, setUtilities] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])

  // Tab 1: Concessionárias
  const [utilName, setUtilName] = useState('')
  const [searchUtil, setSearchUtil] = useState('')
  const [openUtilCombobox, setOpenUtilCombobox] = useState(false)
  const [deleteUtilId, setDeleteUtilId] = useState<string | null>(null)

  // Tab 2: Rede e Tensão
  const [manageNetUtil, setManageNetUtil] = useState<any>(null)
  const [netForm, setNetForm] = useState({ type: 'Monofásico', voltage: '127V' })

  // Tab 3: Form for Rules creation
  const [ruleForm, setRuleForm] = useState({
    utility_id: '',
    classes: [] as string[],
    te: '',
    tusd: '',
    icms_exemption: 'none',
  })

  // Edit/Delete modals
  const [editTariffRule, setEditTariffRule] = useState<any>(null)
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)

  const loadData = async () => {
    try {
      const [utilRes, rulesRes] = await Promise.all([
        pb.collection('pv_utilities').getFullList({ filter: `company_id='${user?.company_id}'` }),
        pb
          .collection('pv_tariff_rules')
          .getFullList({ filter: `company_id='${user?.company_id}'`, expand: 'utility_id' }),
      ])
      setUtilities(utilRes)
      setRules(rulesRes)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (user?.company_id) loadData()
  }, [user?.company_id])

  // Helpers for Number Formats
  const handleNumberChange = (val: string, setter: (v: string) => void) => {
    let clean = val.replace(/[^\d,]/g, '')
    const parts = clean.split(',')
    if (parts.length > 2) {
      clean = parts[0] + ',' + parts.slice(1).join('')
    }
    setter(clean)
  }

  const parseNumber = (val: string) => (val ? Number(val.replace(',', '.')) : 0)
  const formatNumber = (val: number | string | null | undefined) =>
    val !== null && val !== undefined ? val.toString().replace('.', ',') : ''

  // --- Handlers for Tab 1: Concessionárias ---
  const handleAddUtility = async () => {
    if (!utilName) return toast({ variant: 'destructive', title: 'Nome inválido' })

    const exists = utilities.some((d) => d.name.toLowerCase() === utilName.toLowerCase())
    if (exists) {
      return toast({
        variant: 'destructive',
        title: `A concessionária ${utilName} já está cadastrada.`,
      })
    }

    try {
      await pb
        .collection('pv_utilities')
        .create({ name: utilName, company_id: user?.company_id, connections: [] })
      toast({ title: 'Sucesso', description: 'Concessionária adicionada.' })
      setUtilName('')
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  const handleDeleteUtil = async (id: string) => {
    try {
      await pb.collection('pv_utilities').delete(id)
      toast({ title: 'Sucesso', description: 'Concessionária excluída.' })
      setDeleteUtilId(null)
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  // --- Handlers for Tab 2: Rede e Tensão ---
  const handleAddNetwork = async () => {
    try {
      const connections = manageNetUtil.connections || []
      const newConn = { id: Date.now().toString(), type: netForm.type, voltage: netForm.voltage }
      const updated = { ...manageNetUtil, connections: [...connections, newConn] }

      await pb
        .collection('pv_utilities')
        .update(manageNetUtil.id, { connections: updated.connections })
      setManageNetUtil(updated)
      loadData()
      toast({ title: 'Sucesso', description: 'Conexão adicionada.' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  const handleRemoveNetwork = async (connId: string) => {
    try {
      const connections = manageNetUtil.connections.filter((c: any) => c.id !== connId)
      const updated = { ...manageNetUtil, connections }
      await pb.collection('pv_utilities').update(manageNetUtil.id, { connections })
      setManageNetUtil(updated)
      loadData()
      toast({ title: 'Sucesso', description: 'Conexão removida.' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    }
  }

  // --- Handlers for Tab 3: Classes e Tarifas ---
  const [duplicateRulesDialog, setDuplicateRulesDialog] = useState<{
    open: boolean
    existing: any[]
    newClasses: string[]
  }>({ open: false, existing: [], newClasses: [] })

  const proceedCreateRules = async (classesToCreate: string[], classesToUpdate: any[]) => {
    try {
      for (const cls of classesToCreate) {
        await pb.collection('pv_tariff_rules').create({
          company_id: user?.company_id,
          utility_id: ruleForm.utility_id,
          class: cls,
          te: parseNumber(ruleForm.te),
          tusd: parseNumber(ruleForm.tusd),
          icms_exemption: ruleForm.icms_exemption,
          network_type: '',
          voltage: '',
        })
      }

      for (const rule of classesToUpdate) {
        await pb.collection('pv_tariff_rules').update(rule.id, {
          te: parseNumber(ruleForm.te),
          tusd: parseNumber(ruleForm.tusd),
          icms_exemption: ruleForm.icms_exemption,
        })
      }

      toast({ title: 'Sucesso', description: 'Regras tarifárias salvas com sucesso.' })
      setRuleForm({ ...ruleForm, classes: [], te: '', tusd: '' })
      setDuplicateRulesDialog({ open: false, existing: [], newClasses: [] })
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message })
    }
  }

  const handleCreateRule = async () => {
    if (!ruleForm.utility_id || ruleForm.classes.length === 0 || !ruleForm.te || !ruleForm.tusd) {
      return toast({ variant: 'destructive', title: 'Preencha todos os campos obrigatórios' })
    }

    const existingForUtil = rules.filter((r) => r.utility_id === ruleForm.utility_id)
    const existingOverlaps = existingForUtil.filter((r) => ruleForm.classes.includes(r.class))

    if (existingOverlaps.length > 0) {
      const newClasses = ruleForm.classes.filter(
        (c) => !existingOverlaps.find((r) => r.class === c),
      )
      setDuplicateRulesDialog({
        open: true,
        existing: existingOverlaps,
        newClasses,
      })
      return
    }

    await proceedCreateRules(ruleForm.classes, [])
  }

  const handleUpdateTariff = async () => {
    try {
      await pb.collection('pv_tariff_rules').update(editTariffRule.id, {
        class: editTariffRule.class,
        te: parseNumber(editTariffRule.te),
        tusd: parseNumber(editTariffRule.tusd),
        icms_exemption: editTariffRule.icms_exemption,
      })
      toast({ title: 'Sucesso', description: 'Tarifa atualizada.' })
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
          <TabsTrigger value="rede">Rede e Tensão</TabsTrigger>
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
                  <Popover open={openUtilCombobox} onOpenChange={setOpenUtilCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between bg-background"
                      >
                        {utilName || 'Selecione ou digite...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[380px] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Buscar concessionária..."
                          onValueChange={setSearchUtil}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-sm"
                              onClick={() => {
                                setUtilName(searchUtil)
                                setOpenUtilCombobox(false)
                              }}
                            >
                              Criar "{searchUtil}"
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
                                      setUtilName(u.n)
                                      setOpenUtilCombobox(false)
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 h-4 w-4',
                                        utilName === u.n ? 'opacity-100' : 'opacity-0',
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
                <Button onClick={handleAddUtility} disabled={!utilName}>
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
                    {utilities.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => setDeleteUtilId(u.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {utilities.length === 0 && (
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
                Configure os tipos de conexão e tensões de forma independente por concessionária.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Concessionária</TableHead>
                      <TableHead>Conexões Configuradas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utilities.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>
                          {u.connections && u.connections.length > 0
                            ? u.connections.map((c: any) => `${c.type} (${c.voltage})`).join(', ')
                            : 'Nenhuma conexão configurada'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setManageNetUtil({ ...u })}
                          >
                            Gerenciar Redes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {utilities.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                          Nenhuma concessionária encontrada.
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
                Configure em lote as tarifas e isenções aplicadas a diferentes classes de consumo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-5 rounded-lg border border-border/50">
                <div className="space-y-2 md:col-span-2">
                  <Label>Concessionária</Label>
                  <Select
                    value={ruleForm.utility_id}
                    onValueChange={(v) => setRuleForm({ ...ruleForm, utility_id: v })}
                  >
                    <SelectTrigger className="bg-background max-w-md">
                      <SelectValue placeholder="Selecione a concessionária..." />
                    </SelectTrigger>
                    <SelectContent>
                      {utilities.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3 md:col-span-2">
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
                  <div className="relative max-w-[200px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                      R$
                    </span>
                    <Input
                      placeholder="0,36"
                      className="pl-9 bg-background"
                      value={ruleForm.te}
                      onChange={(e) =>
                        handleNumberChange(e.target.value, (v) =>
                          setRuleForm({ ...ruleForm, te: v }),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tarifa de Uso (TUSD)</Label>
                  <div className="relative max-w-[200px]">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                      R$
                    </span>
                    <Input
                      placeholder="0,48"
                      className="pl-9 bg-background"
                      value={ruleForm.tusd}
                      onChange={(e) =>
                        handleNumberChange(e.target.value, (v) =>
                          setRuleForm({ ...ruleForm, tusd: v }),
                        )
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center gap-2">
                    <Label>Isenção de ICMS</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger type="button">
                          <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Defina a aplicação de isenção de ICMS sobre a parcela de energia
                            compensada.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={ruleForm.icms_exemption}
                    onValueChange={(v) => setRuleForm({ ...ruleForm, icms_exemption: v })}
                  >
                    <SelectTrigger className="bg-background max-w-[200px]">
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

                <div className="md:col-span-2 flex justify-end">
                  <Button onClick={handleCreateRule}>Salvar Tarifas</Button>
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
                        <TableCell className="font-medium">{r.expand?.utility_id?.name}</TableCell>
                        <TableCell>{r.class}</TableCell>
                        <TableCell>R$ {formatNumber(r.te)}</TableCell>
                        <TableCell>R$ {formatNumber(r.tusd)}</TableCell>
                        <TableCell className="capitalize">{r.icms_exemption}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setEditTariffRule({
                                ...r,
                                te: formatNumber(r.te),
                                tusd: formatNumber(r.tusd),
                              })
                            }
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

      {/* Manage Networks Modal */}
      <Dialog open={!!manageNetUtil} onOpenChange={(o) => !o && setManageNetUtil(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerenciar Redes - {manageNetUtil?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex gap-4 items-end">
              <div className="space-y-2 flex-1">
                <Label>Tipo de Conexão</Label>
                <Select
                  value={netForm.type}
                  onValueChange={(v) => setNetForm({ ...netForm, type: v })}
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
              <div className="space-y-2 flex-1">
                <Label>Tensão</Label>
                <Select
                  value={netForm.voltage}
                  onValueChange={(v) => setNetForm({ ...netForm, voltage: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="127V">127V</SelectItem>
                    <SelectItem value="220V">220V</SelectItem>
                    <SelectItem value="127-220V">127-220V</SelectItem>
                    <SelectItem value="127-254V">127-254V</SelectItem>
                    <SelectItem value="220-380V">220-380V</SelectItem>
                    <SelectItem value="220-440V">220-440V</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddNetwork}>Adicionar</Button>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Conexão</TableHead>
                    <TableHead>Tensão</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(manageNetUtil?.connections || []).map((conn: any) => (
                    <TableRow key={conn.id}>
                      <TableCell>{conn.type}</TableCell>
                      <TableCell>{conn.voltage}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveNetwork(conn.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!manageNetUtil?.connections || manageNetUtil.connections.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center py-4 text-muted-foreground text-sm"
                      >
                        Nenhuma conexão configurada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageNetUtil(null)}>
              Fechar
            </Button>
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
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    R$
                  </span>
                  <Input
                    placeholder="0,36"
                    value={editTariffRule?.te || ''}
                    onChange={(e) =>
                      handleNumberChange(e.target.value, (v) =>
                        setEditTariffRule({ ...editTariffRule, te: v }),
                      )
                    }
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>TUSD</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                    R$
                  </span>
                  <Input
                    placeholder="0,48"
                    value={editTariffRule?.tusd || ''}
                    onChange={(e) =>
                      handleNumberChange(e.target.value, (v) =>
                        setEditTariffRule({ ...editTariffRule, tusd: v }),
                      )
                    }
                    className="pl-9"
                  />
                </div>
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

      {/* Delete Utility Confirmation Modal */}
      <Dialog open={!!deleteUtilId} onOpenChange={(o) => !o && setDeleteUtilId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deseja realmente excluir esta concessionária? Regras e conexões associadas poderão ser
            perdidas.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUtilId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUtilId && handleDeleteUtil(deleteUtilId)}
            >
              Excluir Concessionária
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Rules Confirmation Modal */}
      <Dialog
        open={duplicateRulesDialog.open}
        onOpenChange={(o) =>
          !o && setDuplicateRulesDialog({ open: false, existing: [], newClasses: [] })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Classes já cadastradas</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {duplicateRulesDialog.existing.length > 1 ? 'As classes' : 'A classe'}{' '}
            {duplicateRulesDialog.existing.map((r) => r.class).join(', ')} já{' '}
            {duplicateRulesDialog.existing.length > 1 ? 'possuem' : 'possui'} valores salvos para
            esta concessionária. Deseja atualizar os valores existentes?
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateRulesDialog({ open: false, existing: [], newClasses: [] })}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                proceedCreateRules(duplicateRulesDialog.newClasses, duplicateRulesDialog.existing)
              }
            >
              Atualizar Valores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
