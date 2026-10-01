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
import {
  Plus,
  Pencil,
  Trash2,
  Info,
  Building2,
  Search,
  CheckCircle2,
  Zap,
  TrendingUp,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { NumericInput } from '@/components/ui/numeric-input'
import {
  NOMINAL_VOLTAGES,
  NETWORK_TYPES,
  PHASE_VOLTAGE_TOOLTIP,
  LINE_VOLTAGE_TOOLTIP,
  UtilityNetworkVoltages,
} from '@/types/electric-network'
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

  // Edição de concessionária personalizada (item 5)
  const [editingCustomUtil, setEditingCustomUtil] = useState<any | null>(null)
  const [editCustomName, setEditCustomName] = useState('')
  const [savingCustomEdit, setSavingCustomEdit] = useState(false)

  // Configuração de tensões fase e linha por concessionária (item 1)
  const [voltageModalUtil, setVoltageModalUtil] = useState<any | null>(null)
  const [voltageModalMap, setVoltageModalMap] = useState<UtilityNetworkVoltages>({})
  const [savingVoltages, setSavingVoltages] = useState(false)

  // Reajuste tarifário anual médio da companhia
  const [tariffAdjustmentModalOpen, setTariffAdjustmentModalOpen] = useState(false)
  const [companyTariffAdjustment, setCompanyTariffAdjustment] = useState<number>(0)
  const [savingTariffAdjustment, setSavingTariffAdjustment] = useState(false)

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

      // Carregar reajuste tarifário anual da companhia
      try {
        const comp = await pb.collection('companies').getOne(companyId)
        setCompanyTariffAdjustment(Number(comp.annual_tariff_adjustment) || 0)
      } catch (e) {
        console.warn('Não foi possível carregar reajuste tarifário da companhia:', e)
      }
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

  // Abrir modal de edição de concessionária personalizada
  const handleOpenEditCustom = (cu: any) => {
    setEditingCustomUtil(cu)
    setEditCustomName(cu.name || '')
  }

  const handleSaveCustomEdit = async () => {
    const trimmed = editCustomName.trim()
    if (!trimmed) {
      toast({ variant: 'destructive', title: 'Nome obrigatório' })
      return
    }
    if (!editingCustomUtil) return

    setSavingCustomEdit(true)
    try {
      await pb.collection('pv_utilities').update(editingCustomUtil.id, { name: trimmed })
      toast({ title: 'Concessionária atualizada', description: trimmed })
      setEditingCustomUtil(null)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar',
        description: err.message,
      })
    } finally {
      setSavingCustomEdit(false)
    }
  }

  // Abrir modal de tensões de fase e linha por tipo de rede
  const handleOpenVoltagesModal = (util: any) => {
    setVoltageModalUtil(util)
    const current = (util.network_voltages as UtilityNetworkVoltages) || {}
    // Clona o estado atual garantindo objeto
    const initialMap: UtilityNetworkVoltages = {}
    for (const net of NETWORK_TYPES) {
      initialMap[net] = {
        phase: current[net]?.phase || '',
        line: current[net]?.line || '',
      }
    }
    setVoltageModalMap(initialMap)
  }

  const handleSaveVoltagesModal = async () => {
    if (!voltageModalUtil) return
    setSavingVoltages(true)
    try {
      await pb.collection('pv_utilities').update(voltageModalUtil.id, {
        network_voltages: voltageModalMap,
      })
      toast({
        title: 'Tensões salvas com sucesso',
        description: `Configuração atualizada para ${voltageModalUtil.name}`,
      })
      setVoltageModalUtil(null)
      await loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar tensões',
        description: err.message,
      })
    } finally {
      setSavingVoltages(false)
    }
  }

  const updateVoltageField = (net: string, field: 'phase' | 'line', value: string) => {
    setVoltageModalMap((prev) => ({
      ...prev,
      [net]: {
        ...prev[net],
        [field]: value === 'none' ? '' : value,
      },
    }))
  }

  const handleSaveCompanyTariffAdjustment = async () => {
    if (!companyId) return
    setSavingTariffAdjustment(true)
    try {
      await pb.collection('companies').update(companyId, {
        annual_tariff_adjustment: Number(companyTariffAdjustment) || 0,
      })
      // Sincronizar também com proposal_settings caso exista para manter coerência
      try {
        const setting = await pb
          .collection('proposal_settings')
          .getFirstListItem(`company_id='${companyId}'`)
        if (setting) {
          await pb.collection('proposal_settings').update(setting.id, {
            default_tariff_adjustment: Number(companyTariffAdjustment) || 0,
          })
        }
      } catch {
        /* intentionally ignored */
      }

      toast({
        title: 'Reajuste tarifário salvo',
        description: `Reajuste médio de ${companyTariffAdjustment}% configurado para a empresa.`,
      })
      setTariffAdjustmentModalOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar reajuste',
        description: err.message,
      })
    } finally {
      setSavingTariffAdjustment(false)
    }
  }

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

          {/* Concessionárias Personalizadas (UX aprimorada - item 5) */}
          <div className="p-4 rounded-xl border bg-slate-50/70 dark:bg-slate-900/40 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Concessionárias / Cooperativas Personalizadas
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Distribuidoras locais cadastradas pela sua empresa que não fazem parte da lista
                  nacional.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-normal">
                {customUtilities.length}{' '}
                {customUtilities.length === 1 ? 'cadastrada' : 'cadastradas'}
              </Badge>
            </div>

            {customUtilities.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                Nenhuma concessionária personalizada cadastrada. Use o campo acima para adicionar
                uma cooperativa ou distribuidora local.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {customUtilities.map((cu) => {
                  const ruleCount = rulesCountByUtility[cu.id] || 0
                  const hasVoltages =
                    cu.network_voltages && Object.keys(cu.network_voltages).length > 0
                  return (
                    <div
                      key={cu.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-lg border bg-background shadow-xs hover:border-border transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          <span className="font-medium text-sm truncate" title={cu.name}>
                            {cu.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-muted-foreground">
                            {ruleCount} {ruleCount === 1 ? 'tarifa' : 'tarifas'}
                          </span>
                          {hasVoltages && (
                            <span className="text-[10px] bg-primary/10 text-primary font-medium px-1.5 py-0.5 rounded">
                              Tensões def.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                          onClick={() => setTariffAdjustmentModalOpen(true)}
                          title="Reajuste Tarifário Anual Médio (%)"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleOpenVoltagesModal(cu)}
                          title="Configurar Tensões de Fase e Linha"
                        >
                          <Zap className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEditCustom(cu)}
                          title="Editar nome"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleToggleUtility(cu.name)}
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Grade de Concessionárias da Lista Base Canônica */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Distribuidoras Padrão (Brasil)
              </p>
              <span className="text-xs text-muted-foreground">
                Clique no ícone de raio <Zap className="w-3 h-3 inline text-primary mx-0.5" /> para
                tensões ou no ícone <TrendingUp className="w-3 h-3 inline text-amber-500 mx-0.5" />{' '}
                para reajuste anual.
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto p-1 border rounded-lg bg-background">
              {filteredBase.map((item) => {
                const key = item.name.trim().toLowerCase()
                const isEnabled = enabledMap.has(key)
                const isToggling = Boolean(togglingNames[item.name])
                const utilRec = enabledMap.get(key)
                const count = utilRec ? rulesCountByUtility[utilRec.id] || 0 : 0
                const hasVoltages =
                  utilRec?.network_voltages && Object.keys(utilRec.network_voltages).length > 0

                return (
                  <div
                    key={`${item.state}-${item.name}`}
                    className={`flex items-start gap-2.5 p-2 rounded-md border text-sm transition-colors ${
                      isEnabled
                        ? 'border-primary/50 bg-primary/5 text-foreground font-medium'
                        : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <Checkbox
                      checked={isEnabled}
                      disabled={isToggling}
                      onCheckedChange={() => handleToggleUtility(item.name)}
                      className="mt-0.5 cursor-pointer"
                    />
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => !isToggling && handleToggleUtility(item.name)}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">{item.name}</span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {item.state}
                        </span>
                      </div>
                      {isEnabled && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {count > 0 && (
                            <span className="text-[11px] text-muted-foreground font-normal">
                              {count} {count === 1 ? 'tarifa' : 'tarifas'}
                            </span>
                          )}
                          {hasVoltages && (
                            <span className="text-[9px] bg-primary/10 text-primary font-medium px-1 rounded">
                              Tensões
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {isEnabled && utilRec && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-amber-500"
                          onClick={(e) => {
                            e.stopPropagation()
                            setTariffAdjustmentModalOpen(true)
                          }}
                          title="Reajuste Tarifário Anual Médio (%)"
                        >
                          <TrendingUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenVoltagesModal(utilRec)
                          }}
                          title="Configurar Tensões de Fase e Linha"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
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
                  <TableHead className="text-center">Tensões</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>{' '}
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
                    <TableCell className="text-center">
                      {(() => {
                        const u = utilities.find((x) => x.id === rule.utility_id)
                        return (
                          <div className="inline-flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-amber-600 hover:text-amber-700 gap-1"
                              onClick={() => setTariffAdjustmentModalOpen(true)}
                              title="Reajuste Tarifário Anual Médio (%)"
                            >
                              <TrendingUp className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Reajuste</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-primary gap-1"
                              onClick={() => u && handleOpenVoltagesModal(u)}
                              disabled={!u}
                            >
                              <Zap className="w-3.5 h-3.5" />
                              Tensões
                            </Button>
                          </div>
                        )
                      })()}
                    </TableCell>
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

      {/* Modal de Edição de Concessionária Personalizada (item 5) */}
      <Dialog
        open={Boolean(editingCustomUtil)}
        onOpenChange={(v) => {
          if (!v) setEditingCustomUtil(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Concessionária Personalizada</DialogTitle>
            <DialogDescription>
              Altere o nome da cooperativa ou distribuidora de energia local.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome da Concessionária</Label>
              <Input
                value={editCustomName}
                onChange={(e) => setEditCustomName(e.target.value)}
                placeholder="Ex: Ceriluz, Creluz, etc."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveCustomEdit()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={savingCustomEdit}
              onClick={() => setEditingCustomUtil(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={savingCustomEdit || !editCustomName.trim()}
              onClick={handleSaveCustomEdit}
            >
              {savingCustomEdit ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração de Tensões Fase e Linha por Concessionária (item 1) */}
      <Dialog
        open={Boolean(voltageModalUtil)}
        onOpenChange={(v) => {
          if (!v) setVoltageModalUtil(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              <DialogTitle>Tensões de Fase e Linha — {voltageModalUtil?.name}</DialogTitle>
            </div>
            <DialogDescription>
              Configure para cada tipo de rede quais são as tensões nominais fase-neutro (fase) e
              fase-fase (linha) adotadas por esta distribuidora.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase px-2 py-1 bg-muted/40 rounded-md">
              <div className="col-span-4">Tipo de Rede</div>
              <div className="col-span-4 flex items-center gap-1">
                <span>Tensão de Fase</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {PHASE_VOLTAGE_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="col-span-4 flex items-center gap-1">
                <span>Tensão de Linha</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {LINE_VOLTAGE_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {NETWORK_TYPES.map((net) => {
                const currentPhase = voltageModalMap[net]?.phase || ''
                const currentLine = voltageModalMap[net]?.line || ''
                return (
                  <div
                    key={net}
                    className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border bg-background hover:bg-muted/20 transition-colors"
                  >
                    <div className="col-span-4 font-medium text-sm">{net}</div>
                    <div className="col-span-4">
                      <Select
                        value={currentPhase || 'none'}
                        onValueChange={(val) => updateVoltageField(net, 'phase', val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não definida</SelectItem>
                          {NOMINAL_VOLTAGES.map((v) => (
                            <SelectItem key={`p-${v}`} value={v}>
                              {v}V (Fase)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4">
                      <Select
                        value={currentLine || 'none'}
                        onValueChange={(val) => updateVoltageField(net, 'line', val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Não definida</SelectItem>
                          {NOMINAL_VOLTAGES.map((v) => (
                            <SelectItem key={`l-${v}`} value={v}>
                              {v}V (Linha)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Exemplo comum:</p>
              <p>Copel em rede Monofásico Rural: Tensão de fase 127V / Tensão de linha 254V.</p>
              <p>
                Rede Trifásica convencional: 127V / 220V ou 220V / 380V conforme a distribuidora.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={savingVoltages}
              onClick={() => setVoltageModalUtil(null)}
            >
              Cancelar
            </Button>
            <Button disabled={savingVoltages} onClick={handleSaveVoltagesModal}>
              {savingVoltages ? 'Salvando...' : 'Salvar Tensões'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Modal de Configuração do Reajuste Tarifário Anual Médio da Empresa */}
      <Dialog open={tariffAdjustmentModalOpen} onOpenChange={setTariffAdjustmentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <DialogTitle>Reajuste Tarifário Anual Médio</DialogTitle>
            </div>
            <DialogDescription>
              Percentual médio de reajuste anual da tarifa de energia elétrica aplicado pela
              distribuidora. Esse índice é utilizado como base global para projeções financeiras das
              propostas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Reajuste Tarifário Anual Médio (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={companyTariffAdjustment}
                  onChange={(e) => setCompanyTariffAdjustment(Number(e.target.value) || 0)}
                  placeholder="Ex: 6.5"
                  className="pr-8"
                />
                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-semibold">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                O valor configurado aqui será sugerido automaticamente como ponto de partida nas
                novas propostas da empresa.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={savingTariffAdjustment}
              onClick={() => setTariffAdjustmentModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button disabled={savingTariffAdjustment} onClick={handleSaveCompanyTariffAdjustment}>
              {savingTariffAdjustment ? 'Salvando...' : 'Salvar Reajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    automaticamente (2025: 60%, 2026: 75%, 2027: 90%, 2028+: 100%).
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
