import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Plus, Pencil, Trash2, Info, Building2, Search, CheckCircle2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { NumericInput } from '@/components/ui/numeric-input'
import { CONSUMER_CATEGORIES } from '@/lib/financial-analysis'

const BASE_CONCESSIONAIRES: { state: string; name: string }[] = [
  { state: 'AC', name: 'Energisa Acre' },
  { state: 'AL', name: 'Equatorial Alagoas' },
  { state: 'AM', name: 'Amazonas Energia' },
  { state: 'AP', name: 'Equatorial Amapá' },
  { state: 'BA', name: 'Neoenergia Coelba' },
  { state: 'CE', name: 'Enel Ceará' },
  { state: 'DF', name: 'Neoenergia Brasília' },
  { state: 'ES', name: 'EDP Espírito Santo' },
  { state: 'GO', name: 'Equatorial Goiás' },
  { state: 'MA', name: 'Equatorial Maranhão' },
  { state: 'MG', name: 'Cemig' },
  { state: 'MS', name: 'Energisa MS' },
  { state: 'MT', name: 'Energisa MT' },
  { state: 'PA', name: 'Equatorial Pará' },
  { state: 'PB', name: 'Energisa Paraíba' },
  { state: 'PE', name: 'Neoenergia Pernambuco' },
  { state: 'PI', name: 'Equatorial Piauí' },
  { state: 'PR', name: 'Copel' },
  { state: 'RJ', name: 'Enel Rio' },
  { state: 'RJ', name: 'Light' },
  { state: 'RN', name: 'Neoenergia Cosern' },
  { state: 'RO', name: 'Energisa Rondônia' },
  { state: 'RR', name: 'Roraima Energia' },
  { state: 'RS', name: 'CEEE Equatorial' },
  { state: 'RS', name: 'RGE' },
  { state: 'SC', name: 'Celesc' },
  { state: 'SE', name: 'Energisa Sergipe' },
  { state: 'SP', name: 'CPFL Paulista' },
  { state: 'SP', name: 'CPFL Piratininga' },
  { state: 'SP', name: 'CPFL Santa Cruz' },
  { state: 'SP', name: 'EDP São Paulo' },
  { state: 'SP', name: 'Elektro (Neoenergia Elektro)' },
  { state: 'SP', name: 'Enel SP' },
  { state: 'TO', name: 'Energisa Tocantins' },
]

const ICMS_EXEMPTIONS = [
  { value: 'none', label: 'Sem Isenção' },
  { value: 'te', label: 'Isento TE' },
  { value: 'tusd', label: 'Isento TUSD' },
  { value: 'both', label: 'Isento Ambos' },
]

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const EMPTY_FORM = {
  utility_id: '',
  class: '',
  network_type: '',
  voltage: '',
  te: 0,
  tusd: 0,
  icms_rate: 0,
  icms_exemption: 'none',
  fio_b_value: 0.22,
}

export function TariffsTab({ companyId: propCompanyId }: { companyId?: string }) {
  const { user } = useAuth()
  const companyId = propCompanyId || user?.company_id
  const { toast } = useToast()

  const [utilities, setUtilities] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_FORM })

  // Estados de gestão de concessionárias
  const [customName, setCustomName] = useState('')
  const [addingCustom, setAddingCustom] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [pendingDisableUtil, setPendingDisableUtil] = useState<any | null>(null)
  const [disabling, setDisabling] = useState(false)
  const [togglingNames, setTogglingNames] = useState<Record<string, boolean>>({})

  const loadData = async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const utils = await pb.collection('pv_utilities').getFullList({
        filter: `company_id='${companyId}'`,
        sort: 'name',
      })
      setUtilities(utils)
      const tariffRules = await pb.collection('pv_tariff_rules').getFullList({
        filter: `company_id='${companyId}'`,
        expand: 'utility_id',
      })
      setRules(tariffRules)
    } catch (err: any) {
      console.error('Erro ao carregar dados de tarifas/concessionárias:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [companyId])

  // Mapa de concessionárias habilitadas pelo nome (case-insensitive e normalizado)
  const enabledMap = useMemo(() => {
    const map = new Map<string, any>()
    for (const u of utilities) {
      if (u.name) {
        map.set(u.name.trim().toLowerCase(), u)
      }
    }
    return map
  }, [utilities])

  // Lista canônica filtrada por busca
  const filteredBase = useMemo(() => {
    const q = searchFilter.trim().toLowerCase()
    if (!q) return BASE_CONCESSIONAIRES
    return BASE_CONCESSIONAIRES.filter(
      (b) => b.name.toLowerCase().includes(q) || b.state.toLowerCase().includes(q),
    )
  }, [searchFilter])

  // Concessionárias habilitadas que NÃO estão na lista canônica (personalizadas)
  const customUtilities = useMemo(() => {
    const baseNames = new Set(BASE_CONCESSIONAIRES.map((b) => b.name.trim().toLowerCase()))
    return utilities.filter((u) => !baseNames.has((u.name || '').trim().toLowerCase()))
  }, [utilities])

  // Contagem de tarifas por concessionária
  const rulesCountByUtility = useMemo(() => {
    const count: Record<string, number> = {}
    for (const r of rules) {
      if (r.utility_id) {
        count[r.utility_id] = (count[r.utility_id] || 0) + 1
      }
    }
    return count
  }, [rules])

  // Ativação / Desativação de Concessionária
  const handleToggleUtility = async (name: string) => {
    if (!companyId) return
    const key = name.trim().toLowerCase()
    const existing = enabledMap.get(key)

    if (existing) {
      // Quer desabilitar. Verifica se tem tarifas associadas
      const count = rulesCountByUtility[existing.id] || 0
      if (count > 0) {
        setPendingDisableUtil({ ...existing, rulesCount: count })
        return
      }
      // Se não tiver tarifas, desabilita direto
      await executeDisableUtility(existing.id, name)
    } else {
      // Habilitar
      setTogglingNames((prev) => ({ ...prev, [name]: true }))
      try {
        await pb.collection('pv_utilities').create({
          company_id: companyId,
          name: name.trim(),
        })
        toast({ title: 'Concessionária habilitada', description: name })
        await loadData()
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Erro ao habilitar concessionária',
          description: err.message,
        })
      } finally {
        setTogglingNames((prev) => ({ ...prev, [name]: false }))
      }
    }
  }

  const executeDisableUtility = async (id: string, name: string) => {
    setDisabling(true)
    try {
      await pb.collection('pv_utilities').delete(id)
      toast({ title: 'Concessionária desabilitada', description: name })
      setPendingDisableUtil(null)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao desabilitar concessionária',
        description: err.message,
      })
    } finally {
      setDisabling(false)
    }
  }

  const handleAddCustomUtility = async () => {
    const trimmed = customName.trim()
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Digite o nome da concessionária ou cooperativa.',
      })
      return
    }
    if (!companyId) return

    const key = trimmed.toLowerCase()
    if (enabledMap.has(key)) {
      toast({
        variant: 'destructive',
        title: 'Já cadastrada',
        description: `A concessionária "${trimmed}" já está habilitada.`,
      })
      return
    }

    setAddingCustom(true)
    try {
      await pb.collection('pv_utilities').create({
        company_id: companyId,
        name: trimmed,
      })
      toast({
        title: 'Concessionária adicionada',
        description: `"${trimmed}" agora está disponível para criação de tarifas.`,
      })
      setCustomName('')
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar',
        description: err.message,
      })
    } finally {
      setAddingCustom(false)
    }
  }

  const handleAdd = () => {
    if (utilities.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhuma concessionária habilitada',
        description:
          'Habilite ao menos uma concessionária no bloco acima antes de cadastrar tarifas.',
      })
      return
    }
    setEditingId(null)
    setForm({ ...EMPTY_FORM, utility_id: utilities[0]?.id || '' })
    setOpen(true)
  }

  const handleEdit = (rule: any) => {
    setEditingId(rule.id)
    setForm({
      utility_id: rule.utility_id || '',
      class: rule.class || '',
      network_type: rule.network_type || '',
      voltage: rule.voltage || '',
      te: Number(rule.te) || 0,
      tusd: Number(rule.tusd) || 0,
      icms_rate: Number(rule.icms_rate) || 0,
      icms_exemption: rule.icms_exemption || 'none',
      fio_b_value: Number(rule.fio_b_value) || 0,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    try {
      const data = { ...form, company_id: companyId }
      if (editingId) {
        await pb.collection('pv_tariff_rules').update(editingId, data)
      } else {
        await pb.collection('pv_tariff_rules').create(data)
      }
      toast({ description: 'Tarifa salva com sucesso' })
      setOpen(false)
      loadData()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar tarifa' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('pv_tariff_rules').delete(id)
      toast({ description: 'Tarifa excluída' })
      loadData()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao excluir' })
    }
  }

  const getUtilityName = (id: string) => utilities.find((u) => u.id === id)?.name || 'N/A'

  const updateForm = (field: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [field]: value }))

  return (
    <div className="space-y-6">
      {/* Bloco 1: Concessionárias Habilitadas da Empresa */}
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              <CardTitle>Concessionárias Habilitadas</CardTitle>
            </div>
            <Badge variant="secondary" className="w-fit text-xs font-normal">
              {utilities.length} {utilities.length === 1 ? 'habilitada' : 'habilitadas'} nesta
              empresa
            </Badge>
          </div>
          <CardDescription>
            Marque as distribuidoras de energia atendidas pela sua empresa. Apenas as
            concessionárias habilitadas aqui estarão disponíveis para criação de regras de tarifa e
            na precificação de propostas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de Ações: Busca + Adicionar Concessionária Personalizada */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou UF (ex: Copel, SP, Cemig)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nome de cooperativa ou local..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddCustomUtility()
                  }
                }}
                className="h-9 text-sm w-full sm:w-64"
              />
              <Button
                size="sm"
                onClick={handleAddCustomUtility}
                disabled={addingCustom || !customName.trim()}
                className="shrink-0 h-9"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Adicionar
              </Button>
            </div>
          </div>

          {/* Concessionárias Personalizadas (se houver) */}
          {customUtilities.length > 0 && (
            <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Concessionárias / Cooperativas Personalizadas
              </p>
              <div className="flex flex-wrap gap-2">
                {customUtilities.map((cu) => {
                  const ruleCount = rulesCountByUtility[cu.id] || 0
                  return (
                    <div
                      key={cu.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background text-sm shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      <span className="font-medium">{cu.name}</span>
                      {ruleCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({ruleCount} {ruleCount === 1 ? 'tarifa' : 'tarifas'})
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleToggleUtility(cu.name)}
                        title="Desabilitar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Grade de Concessionárias da Lista Base Canônica */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Distribuidoras Padrão (Brasil)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto p-1 border rounded-lg bg-background">
              {filteredBase.map((item) => {
                const key = item.name.trim().toLowerCase()
                const isEnabled = enabledMap.has(key)
                const isToggling = Boolean(togglingNames[item.name])
                const utilRec = enabledMap.get(key)
                const count = utilRec ? rulesCountByUtility[utilRec.id] || 0 : 0

                return (
                  <label
                    key={`${item.state}-${item.name}`}
                    className={`flex items-start gap-2.5 p-2 rounded-md border text-sm cursor-pointer transition-colors ${
                      isEnabled
                        ? 'border-primary/50 bg-primary/5 text-foreground font-medium'
                        : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <Checkbox
                      checked={isEnabled}
                      disabled={isToggling}
                      onCheckedChange={() => handleToggleUtility(item.name)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">{item.name}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {item.state}
                        </span>
                      </div>
                      {isEnabled && count > 0 && (
                        <p className="text-[11px] text-muted-foreground font-normal">
                          {count} {count === 1 ? 'tarifa associada' : 'tarifas associadas'}
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2: Regras de Tarifa */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Regras de Tarifa</CardTitle>
            <CardDescription>
              Valores de TE, TUSD, ICMS e Fio B configurados por concessionária habilitada.
            </CardDescription>
          </div>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {utilities.length === 0
                ? 'Habilite uma ou mais concessionárias acima para começar a cadastrar tarifas.'
                : 'Nenhuma tarifa cadastrada. Clique em "Adicionar" para criar.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concessionária</TableHead>
                  <TableHead>Classe</TableHead>
                  <TableHead>TE</TableHead>
                  <TableHead>TUSD</TableHead>
                  <TableHead>ICMS</TableHead>
                  <TableHead>Isenção</TableHead>
                  <TableHead>Fio B</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{getUtilityName(rule.utility_id)}</TableCell>
                    <TableCell>{rule.class}</TableCell>
                    <TableCell>{BRL.format(Number(rule.te) || 0)}</TableCell>
                    <TableCell>{BRL.format(Number(rule.tusd) || 0)}</TableCell>
                    <TableCell>{Number(rule.icms_rate) || 0}%</TableCell>
                    <TableCell>
                      {ICMS_EXEMPTIONS.find((e) => e.value === rule.icms_exemption)?.label || '-'}
                    </TableCell>
                    <TableCell>{BRL.format(Number(rule.fio_b_value) || 0)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alerta de confirmação para desabilitar concessionária com tarifas */}
      <AlertDialog
        open={Boolean(pendingDisableUtil)}
        onOpenChange={(v) => {
          if (!v) setPendingDisableUtil(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desabilitar Concessionária</AlertDialogTitle>
            <AlertDialogDescription>
              A concessionária <strong>{pendingDisableUtil?.name}</strong> possui{' '}
              <strong>{pendingDisableUtil?.rulesCount}</strong> tarifa(s) cadastrada(s). Ao
              desabilitá-la, essa concessionária não poderá mais ser selecionada em novas propostas.
              Deseja realmente prosseguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={disabling}
              onClick={() => {
                if (pendingDisableUtil) {
                  executeDisableUtility(pendingDisableUtil.id, pendingDisableUtil.name)
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {disabling ? 'Desabilitando...' : 'Desabilitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Criação / Edição de Tarifa */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Tarifa' : 'Nova Tarifa'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Concessionária</Label>
              <Select value={form.utility_id} onValueChange={(v) => updateForm('utility_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
            <div className="space-y-2">
              <Label>Classe de Consumo</Label>
              <Select value={form.class} onValueChange={(v) => updateForm('class', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CONSUMER_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>TE (R$/kWh)</Label>
              <NumericInput
                value={form.te}
                onValueChange={(v) => updateForm('te', v)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>TUSD (R$/kWh)</Label>
              <NumericInput
                value={form.tusd}
                onValueChange={(v) => updateForm('tusd', v)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Alíquota ICMS (%)</Label>
              <NumericInput
                value={form.icms_rate}
                onValueChange={(v) => updateForm('icms_rate', v)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Isenção ICMS</Label>
              <Select
                value={form.icms_exemption}
                onValueChange={(v) => updateForm('icms_exemption', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICMS_EXEMPTIONS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="flex items-center gap-1">
                Fio B (R$/kWh)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Insira o valor integral do Fio B. O sistema aplica o escalonamento anual
                    automaticamente (2026: 60%, 2027: 75%, 2028: 90%, 2029+: 100%).
                  </TooltipContent>
                </Tooltip>
              </Label>
              <NumericInput
                value={form.fio_b_value}
                onValueChange={(v) => updateForm('fio_b_value', v)}
                placeholder="0.22"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
