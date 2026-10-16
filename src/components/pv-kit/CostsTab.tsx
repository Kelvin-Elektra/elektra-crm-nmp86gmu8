import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus,
  Trash2,
  Settings2,
  Pencil,
  Sparkles,
  Layers,
  Receipt,
  UserCheck,
  TrendingUp,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import { TaxWeightTooltip } from '@/components/pv-kit/TaxWeightTooltip'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { useRealtime } from '@/hooks/use-realtime'

export type StandardGroupKey = 'imposto' | 'comissao' | 'margem' | 'custom'

interface PvCostRecord {
  id: string
  company_id: string
  name: string
  calc_method: 'fixed' | 'variable' | 'rate' | 'tax' | 'margin' | 'kit_percent' | 'commission'
  value: number | null
  range_type: 'none' | 'kwp' | 'modules' | 'kw'
  min_val: number | null
  max_val: number | null
  installation_id: string | null
  calc_base: 'modules' | 'kwp' | 'kw' | 'fixed' | null
  multiplier: number | null
  user_id: string | null
  is_real_margin: boolean
  tax_weight: number | null
  created?: string
  updated?: string
}

export function CostsTab() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [data, setData] = useState<PvCostRecord[]>([])
  const [installations, setInstallations] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [billingModel, setBillingModel] = useState('direct')
  const [loading, setLoading] = useState(true)

  // Dialog de adicionar / editar item ou faixa
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PvCostRecord | null>(null)

  // Contexto ao abrir dialog
  const [targetGroup, setTargetGroup] = useState<string>('imposto')
  const [customGroupName, setCustomGroupName] = useState('')

  // Form states
  const [formName, setFormName] = useState('')
  const [formCalcMethod, setFormCalcMethod] = useState<
    'fixed' | 'variable' | 'rate' | 'tax' | 'margin' | 'kit_percent' | 'commission'
  >('tax')
  const [formValue, setFormValue] = useState('')
  const [formCalcBase, setFormCalcBase] = useState<'modules' | 'kwp' | 'kw'>('modules')
  const [formMultiplier, setFormMultiplier] = useState('')
  const [formTaxWeight, setFormTaxWeight] = useState('100')
  const [formInstallationId, setFormInstallationId] = useState('none')
  const [formUserId, setFormUserId] = useState('all')

  // Faixas sequenciais inteligentes
  const [hasRange, setHasRange] = useState(false)
  const [rangeMetric, setRangeMetric] = useState<'kwp' | 'modules' | 'kw'>('kwp')
  const [rangeUpperLimit, setRangeUpperLimit] = useState('') // Limite superior definido pelo usuário (ex: 10, 20)
  const [isLastUnlimited, setIsLastUnlimited] = useState(false) // Sem limite superior (acima de X)

  // Modal para criar novo grupo customizado
  const [newGroupDialogOpen, setNewGroupDialogOpen] = useState(false)
  const [newGroupNameInput, setNewGroupNameInput] = useState('')

  // Tipo de margem ativa da empresa: 'margin' (Real - Recomendada) ou 'kit_percent' (Fake)
  const activeMarginType = useMemo<'margin' | 'kit_percent'>(() => {
    const hasFake = data.some((d) => d.calc_method === 'kit_percent')
    if (hasFake) return 'kit_percent'
    return 'margin' // Padrão recomendado: Margem Real
  }, [data])

  const formatNumber = (val: number | string | null | undefined) =>
    val !== null && val !== undefined && val !== '' ? val.toString().replace('.', ',') : ''

  const parseNumber = (val: string): number | null => {
    if (!val || val.trim() === '') return null
    const num = Number(val.replace(',', '.'))
    return isNaN(num) ? null : num
  }

  const handleNumberInput = (setter: (v: string) => void) => (val: string) => {
    let clean = val.replace(/[^0-9,.-]/g, '')
    const parts = clean.split(',')
    if (parts.length > 2) {
      clean = parts[0] + ',' + parts.slice(1).join('')
    }
    setter(clean)
  }

  const loadData = async () => {
    if (!user?.company_id) return
    setLoading(true)
    try {
      const res = (await pb.collection('pv_costs').getFullList({
        filter: `company_id='${user.company_id}'`,
        sort: 'name,min_val,created',
      })) as PvCostRecord[]
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
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao atualizar o modelo.' })
    }
  }

  // Agrupamento dos custos cadastrados
  const categorizedGroups = useMemo(() => {
    const taxList: PvCostRecord[] = []
    const commissionList: PvCostRecord[] = []
    const marginList: PvCostRecord[] = []
    const customMap = new Map<string, PvCostRecord[]>()

    data.forEach((item) => {
      if (item.calc_method === 'tax') {
        taxList.push(item)
      } else if (item.calc_method === 'commission') {
        commissionList.push(item)
      } else if (item.calc_method === 'margin' || item.calc_method === 'kit_percent') {
        marginList.push(item)
      } else {
        // Custo customizado
        const grp = item.name.trim() || 'Outros Custos'
        if (!customMap.has(grp)) {
          customMap.set(grp, [])
        }
        customMap.get(grp)!.push(item)
      }
    })

    const customGroups = Array.from(customMap.entries()).map(([name, items]) => ({
      name,
      items,
    }))

    return {
      tax: taxList,
      commission: commissionList,
      margin: marginList,
      customGroups,
    }
  }, [data])

  // Identificar faixas contíguas existentes para um grupo/item específico
  const getExistingRangesForContext = (
    groupType: string,
    groupName: string,
    currentEditingId?: string | null,
  ) => {
    let relevantItems: PvCostRecord[] = []
    if (groupType === 'imposto') {
      relevantItems = data.filter((d) => d.calc_method === 'tax')
    } else if (groupType === 'comissao') {
      relevantItems = data.filter((d) => d.calc_method === 'commission')
    } else if (groupType === 'margem') {
      relevantItems = data.filter(
        (d) => d.calc_method === 'margin' || d.calc_method === 'kit_percent',
      )
    } else {
      relevantItems = data.filter((d) => d.name.toLowerCase() === groupName.toLowerCase())
    }

    // Apenas os que têm faixa
    const rangeItems = relevantItems
      .filter(
        (d) =>
          d.range_type &&
          d.range_type !== 'none' &&
          (!currentEditingId || d.id !== currentEditingId),
      )
      .sort((a, b) => (Number(a.min_val) || 0) - (Number(b.min_val) || 0))

    return rangeItems
  }

  // Calcular automaticamente o próximo limite inferior contíguo
  const computeNextMinVal = (
    groupType: string,
    groupName: string,
    currentEditingId?: string | null,
  ): number => {
    const existing = getExistingRangesForContext(groupType, groupName, currentEditingId)
    if (existing.length === 0) return 0

    // Pega o maior max_val
    const last = existing[existing.length - 1]
    if (last.max_val !== null && last.max_val !== undefined && Number(last.max_val) > 0) {
      return Number(last.max_val)
    }
    return Number(last.min_val) || 0
  }

  // Abrir modal de criação para um grupo específico
  const handleOpenAddForGroup = (groupType: StandardGroupKey, customName: string = '') => {
    setEditingItem(null)
    setTargetGroup(groupType)
    setCustomGroupName(customName)

    let defaultName = ''
    let defaultMethod: PvCostRecord['calc_method'] = 'fixed'

    if (groupType === 'imposto') {
      defaultName = 'Imposto sobre Venda'
      defaultMethod = 'tax'
    } else if (groupType === 'comissao') {
      defaultName = 'Comissão de Venda'
      defaultMethod = 'commission'
    } else if (groupType === 'margem') {
      defaultName = activeMarginType === 'margin' ? 'Margem Real' : 'Margem Fake'
      defaultMethod = activeMarginType
    } else {
      defaultName = customName || 'Novo Custo'
      defaultMethod = 'fixed'
    }

    // Identificar itens já cadastrados neste grupo para pré-preencher com a regra do grupo
    let groupItems: PvCostRecord[] = []
    if (groupType === 'imposto') {
      groupItems = data.filter((d) => d.calc_method === 'tax')
    } else if (groupType === 'comissao') {
      groupItems = data.filter((d) => d.calc_method === 'commission')
    } else if (groupType === 'margem') {
      groupItems = data.filter((d) => d.calc_method === 'margin' || d.calc_method === 'kit_percent')
    } else {
      groupItems = data.filter(
        (d) => d.name.trim().toLowerCase() === customName.trim().toLowerCase(),
      )
    }

    // Regra de referência para copiar como padrão (última faixa cadastrada ou item principal)
    const sortedGroupItems = [...groupItems].sort(
      (a, b) => (Number(a.min_val) || 0) - (Number(b.min_val) || 0),
    )
    const referenceRule =
      sortedGroupItems.length > 0 ? sortedGroupItems[sortedGroupItems.length - 1] : null

    if (referenceRule) {
      setFormName(referenceRule.name || defaultName)
      setFormCalcMethod(referenceRule.calc_method || defaultMethod)
      setFormValue(formatNumber(referenceRule.value))
      setFormCalcBase((referenceRule.calc_base as any) || 'modules')
      setFormMultiplier(formatNumber(referenceRule.multiplier))
      setFormTaxWeight(formatNumber(referenceRule.tax_weight ?? 100))
      setFormInstallationId(referenceRule.installation_id || 'none')
      setFormUserId(referenceRule.user_id || 'all')
    } else {
      setFormName(defaultName)
      setFormCalcMethod(defaultMethod)
      setFormValue('')
      setFormCalcBase('modules')
      setFormMultiplier('')
      setFormTaxWeight('100')
      setFormInstallationId('none')
      setFormUserId('all')
    }

    // Verificar se o grupo já trabalha com faixas
    const existingRanges = getExistingRangesForContext(groupType, customName)
    if (existingRanges.length > 0) {
      setHasRange(true)
      const detectedMetric = existingRanges[0].range_type
      setRangeMetric(detectedMetric === 'none' ? 'kwp' : detectedMetric)
      const nextMin = computeNextMinVal(groupType, customName)
      // Sugerir próximo limite superior contíguo (ex: +10 ou +20)
      setRangeUpperLimit(nextMin > 0 ? String(nextMin + 10) : '10')
      setIsLastUnlimited(false)
    } else {
      setHasRange(false)
      setRangeMetric('kwp')
      setRangeUpperLimit('10')
      setIsLastUnlimited(false)
    }

    setDialogOpen(true)
  }

  // Abrir modal para editar item
  const handleOpenEdit = (item: PvCostRecord) => {
    setEditingItem(item)

    // Descobrir o grupo
    let grp: StandardGroupKey = 'custom'
    if (item.calc_method === 'tax') grp = 'imposto'
    else if (item.calc_method === 'commission') grp = 'comissao'
    else if (item.calc_method === 'margin' || item.calc_method === 'kit_percent') grp = 'margem'

    setTargetGroup(grp)
    setCustomGroupName(grp === 'custom' ? item.name : '')
    setFormName(item.name)
    setFormCalcMethod(item.calc_method)
    setFormValue(formatNumber(item.value))
    setFormCalcBase((item.calc_base as any) || 'modules')
    setFormMultiplier(formatNumber(item.multiplier))
    setFormTaxWeight(formatNumber(item.tax_weight ?? 100))
    setFormInstallationId(item.installation_id || 'none')
    setFormUserId(item.user_id || 'all')

    if (item.range_type && item.range_type !== 'none') {
      setHasRange(true)
      setRangeMetric(item.range_type)
      if (item.max_val !== null && item.max_val !== undefined && Number(item.max_val) > 0) {
        setRangeUpperLimit(formatNumber(item.max_val))
        setIsLastUnlimited(false)
      } else {
        setRangeUpperLimit('')
        setIsLastUnlimited(true)
      }
    } else {
      setHasRange(false)
      setRangeMetric('kwp')
      setRangeUpperLimit('10')
      setIsLastUnlimited(false)
    }

    setDialogOpen(true)
  }

  // Deletar item
  const handleDelete = async (id: string) => {
    try {
      await pb.collection('pv_costs').delete(id)
      toast({ title: 'Sucesso', description: 'Item removido.' })
      loadData()
    } catch {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao remover o item.' })
    }
  }

  // Troca de tipo de margem padrão (Real vs Fake)
  const handleChangeMarginType = async (newType: 'margin' | 'kit_percent') => {
    if (newType === activeMarginType) return
    const opposingType = newType === 'margin' ? 'kit_percent' : 'margin'
    const itemsToConvert = data.filter((d) => d.calc_method === opposingType)

    if (itemsToConvert.length === 0) {
      toast({
        title: 'Tipo de margem selecionado',
        description:
          newType === 'margin'
            ? 'Margem Real configurada (Recomendada).'
            : 'Margem Fake configurada sobre o kit.',
      })
      return
    }

    try {
      // Atualizar itens existentes para o novo tipo
      for (const item of itemsToConvert) {
        await pb.collection('pv_costs').update(item.id, {
          calc_method: newType,
          is_real_margin: newType === 'margin',
        })
      }
      toast({
        title: 'Tipo de margem atualizado',
        description: `As margens foram migradas para ${newType === 'margin' ? 'Margem Real (Recomendada)' : 'Margem Fake'}.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao trocar tipo de margem',
        description: err?.message || 'Falha ao atualizar margens existentes.',
      })
    }
  }

  // Salvar item/faixa (Criar ou Atualizar)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id) return

    // Validações
    let finalCalcMethod = formCalcMethod

    // Forçar método correspondente ao grupo
    if (targetGroup === 'imposto') {
      finalCalcMethod = 'tax'
    } else if (targetGroup === 'comissao') {
      finalCalcMethod = 'commission'
    } else if (targetGroup === 'margem') {
      finalCalcMethod = activeMarginType
    }

    // Se é margem, assegura que não misture com o tipo oposto
    const opposingMethod = finalCalcMethod === 'margin' ? 'kit_percent' : 'margin'
    const hasOpposing = data.some(
      (d) => d.calc_method === opposingMethod && (!editingItem || d.id !== editingItem.id),
    )
    if (['margin', 'kit_percent'].includes(finalCalcMethod) && hasOpposing) {
      toast({
        variant: 'destructive',
        title: 'Conflito de tipo de margem',
        description: `A empresa possui itens com ${opposingMethod === 'margin' ? 'Margem Real' : 'Margem Fake'}. Alterne a configuração de margem no topo antes de salvar.`,
      })
      return
    }

    // Cálculo e validação de faixas sequenciais contíguas
    let range_type: 'none' | 'kwp' | 'modules' | 'kw' = 'none'
    let min_val: number | null = null
    let max_val: number | null = null

    if (hasRange) {
      range_type = rangeMetric

      if (editingItem) {
        // Na edição mantemos o min_val existente ou 0
        min_val = editingItem.min_val !== null ? Number(editingItem.min_val) : 0
      } else {
        // Na criação calculamos o limite inferior automaticamente a partir da faixa anterior
        min_val = computeNextMinVal(targetGroup, customGroupName, null)
      }

      if (isLastUnlimited) {
        max_val = null
      } else {
        const parsedUpper = parseNumber(rangeUpperLimit)
        if (parsedUpper === null || parsedUpper <= 0) {
          toast({
            variant: 'destructive',
            title: 'Limite superior obrigatório',
            description:
              'Informe o limite superior da faixa (ex: 10, 20) ou marque como "Acima de...".',
          })
          return
        }
        if (min_val !== null && parsedUpper <= min_val) {
          toast({
            variant: 'destructive',
            title: 'Limite inválido',
            description: `O limite superior (${parsedUpper}) deve ser estritamente maior que o início da faixa (${min_val}).`,
          })
          return
        }
        max_val = parsedUpper
      }
    }

    const payload: Partial<PvCostRecord> = {
      company_id: user.company_id,
      name: formName.trim() || (targetGroup === 'custom' ? customGroupName : 'Custo'),
      calc_method: finalCalcMethod,
      range_type,
      min_val,
      max_val,
      installation_id: formInstallationId !== 'none' ? formInstallationId : null,
      user_id: formUserId !== 'all' ? formUserId : null,
      is_real_margin: finalCalcMethod === 'margin',
    }

    if (finalCalcMethod === 'variable') {
      const parsedMult = parseNumber(formMultiplier)
      if (parsedMult === null) {
        toast({
          variant: 'destructive',
          title: 'Multiplicador obrigatório',
          description: 'Informe o multiplicador unitário para o custo variável.',
        })
        return
      }
      payload.calc_base = formCalcBase
      payload.multiplier = parsedMult
      payload.value = null
    } else {
      const parsedVal = parseNumber(formValue)
      if (parsedVal === null) {
        toast({
          variant: 'destructive',
          title: 'Valor obrigatório',
          description: 'Informe o valor numérico (R$ ou %).',
        })
        return
      }
      payload.value = parsedVal
      payload.calc_base = 'fixed'
      payload.multiplier = null
    }

    if (finalCalcMethod === 'tax') {
      payload.tax_weight = parseNumber(formTaxWeight) ?? 100
    } else {
      payload.tax_weight = null
    }

    try {
      if (editingItem) {
        await pb.collection('pv_costs').update(editingItem.id, payload)
        toast({ title: 'Sucesso', description: 'Item atualizado com sucesso.' })
      } else {
        await pb.collection('pv_costs').create(payload)
        toast({ title: 'Sucesso', description: 'Item/Faixa cadastrada com sucesso.' })
      }

      setDialogOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err?.message || 'Falha ao salvar no banco de dados.',
      })
    }
  }

  // Criar novo grupo customizado
  const handleCreateCustomGroup = () => {
    const trimmed = newGroupNameInput.trim()
    if (!trimmed) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Informe o nome do grupo.',
      })
      return
    }
    setNewGroupDialogOpen(false)
    setNewGroupNameInput('')
    handleOpenAddForGroup('custom', trimmed)
  }

  const getMetricLabel = (m: string) => {
    if (m === 'kwp') return 'kWp (Potência do Kit)'
    if (m === 'modules') return 'Módulos'
    if (m === 'kw') return 'kW (Inversor)'
    return 'Geral'
  }

  const renderGroupCard = (
    title: string,
    description: string,
    icon: React.ReactNode,
    items: PvCostRecord[],
    groupKey: StandardGroupKey,
    customName?: string,
  ) => {
    const isMargin = groupKey === 'margem'
    const isTax = groupKey === 'imposto'
    const totalTaxWeight = isTax
      ? items.reduce((sum, i) => sum + (Number(i.tax_weight) || 0), 0)
      : null

    // Verificar se os itens deste grupo têm faixas
    const rangeItems = items.filter((i) => i.range_type && i.range_type !== 'none')
    const hasRanges = rangeItems.length > 0
    const commonMetric = hasRanges ? rangeItems[0].range_type : 'kwp'

    return (
      <Card
        key={title}
        className="border-border/70 shadow-sm hover:border-primary/30 transition-all"
      >
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">{icon}</div>
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  {title}
                  {items.length > 0 && (
                    <Badge variant="secondary" className="font-normal text-xs">
                      {items.length} {items.length === 1 ? 'regra' : 'regras'}
                    </Badge>
                  )}
                  {hasRanges && (
                    <Badge
                      variant="outline"
                      className="text-xs border-primary/40 text-primary font-normal"
                    >
                      Por Faixa (
                      {commonMetric === 'modules'
                        ? 'Nº de módulos'
                        : commonMetric === 'kwp'
                          ? 'kWp'
                          : commonMetric === 'kw'
                            ? 'kW'
                            : commonMetric}
                      )
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  {description}
                </CardDescription>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => handleOpenAddForGroup(groupKey, customName)}
            className="shrink-0"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {hasRanges ? 'Adicionar Faixa' : 'Adicionar Item'}
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Alerta de peso para impostos se diferente de 100% */}
          {isTax && items.length > 0 && totalTaxWeight !== 100 && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 text-amber-900 dark:text-amber-200 border border-amber-500/20 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                A soma dos pesos dos impostos está em <strong>{totalTaxWeight}%</strong>. O
                recomendado é totalizar <strong>100%</strong>.
              </span>
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-lg bg-muted/20">
              <p className="text-xs text-muted-foreground">Nenhuma regra cadastrada neste grupo.</p>
              <Button
                variant="link"
                size="sm"
                onClick={() => handleOpenAddForGroup(groupKey, customName)}
                className="text-xs mt-1"
              >
                Cadastrar agora
              </Button>
            </div>
          ) : (
            <div className="divide-y rounded-lg border bg-background overflow-hidden text-sm">
              {items.map((item, idx) => {
                const isItemRange = item.range_type && item.range_type !== 'none'
                const min = Number(item.min_val) || 0
                const hasMax =
                  item.max_val !== null && item.max_val !== undefined && Number(item.max_val) > 0
                const max = hasMax ? Number(item.max_val) : null

                // Formatação da faixa sequencial
                let rangeLabel = 'Geral (Sempre aplica)'
                if (isItemRange) {
                  const metricUnit =
                    item.range_type === 'kwp'
                      ? 'kWp'
                      : item.range_type === 'modules'
                        ? 'mód.'
                        : 'kW'
                  if (min === 0 && max !== null) {
                    rangeLabel = `Até ${formatNumber(max)} ${metricUnit}`
                  } else if (min > 0 && max !== null) {
                    rangeLabel = `De ${formatNumber(min)} até ${formatNumber(max)} ${metricUnit}`
                  } else if (min > 0 && max === null) {
                    rangeLabel = `Acima de ${formatNumber(min)} ${metricUnit}`
                  } else {
                    rangeLabel = `Faixa (${formatNumber(min)} a ${max ? formatNumber(max) : '∞'})`
                  }
                }

                // Formatação do valor / método
                let valueDisplay = ''
                if (item.calc_method === 'fixed') {
                  valueDisplay = `R$ ${formatNumber(item.value)}`
                } else if (item.calc_method === 'variable') {
                  const baseMap: Record<string, string> = {
                    modules: 'módulos',
                    kwp: 'kWp',
                    kw: 'kW',
                  }
                  valueDisplay = `R$ ${formatNumber(item.multiplier)} × ${baseMap[item.calc_base || 'modules'] || 'módulos'}`
                } else {
                  valueDisplay = `${formatNumber(item.value)}%`
                  if (item.calc_method === 'tax' && item.tax_weight !== null) {
                    valueDisplay += ` (Peso: ${formatNumber(item.tax_weight)}%)`
                  }
                }

                return (
                  <div
                    key={item.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-foreground">{item.name}</span>
                        {isItemRange ? (
                          <Badge variant="outline" className="text-xs bg-muted/40 font-medium">
                            {rangeLabel}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="text-[11px] font-normal text-muted-foreground"
                          >
                            Geral
                          </Badge>
                        )}
                        {item.installation_id && (
                          <Badge
                            variant="outline"
                            className="text-[11px] border-amber-300 text-amber-700 bg-amber-50"
                          >
                            Instalação Específica
                          </Badge>
                        )}
                        {item.user_id && (
                          <Badge
                            variant="outline"
                            className="text-[11px] border-blue-300 text-blue-700 bg-blue-50"
                          >
                            Colaborador Específico
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>
                          Método:{' '}
                          {item.calc_method === 'tax'
                            ? 'Imposto'
                            : item.calc_method === 'commission'
                              ? 'Comissão'
                              : item.calc_method === 'margin'
                                ? 'Margem Real'
                                : item.calc_method === 'kit_percent'
                                  ? 'Margem Fake'
                                  : item.calc_method === 'fixed'
                                    ? 'Fixo'
                                    : item.calc_method === 'variable'
                                      ? 'Variável'
                                      : 'Percentual'}
                        </span>
                        <span>•</span>
                        <span className="font-semibold text-foreground text-xs">
                          {valueDisplay}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 self-end sm:self-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Próximo limite inferior sugerido para o dialog atual
  const currentNextMin = useMemo(() => {
    return computeNextMinVal(targetGroup, customGroupName, editingItem?.id)
  }, [targetGroup, customGroupName, editingItem, data])

  return (
    <div className="space-y-6">
      {/* 1. MODELO DE FATURAMENTO */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center">
            <Settings2 className="w-4 h-4 mr-2 text-primary" />
            Modelo de Faturamento da Empresa
          </CardTitle>
          <CardDescription className="text-xs">
            Como a sua empresa fatura o kit fotovoltaico vendido ao cliente final?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={billingModel} onValueChange={handleBillingModelChange}>
            <SelectTrigger className="bg-background max-w-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">
                Minha empresa fatura a venda com o valor cheio para o consumidor final (Faturamento
                Direto)
              </SelectItem>
              <SelectItem value="intermediated">
                O distribuidor fatura o kit e minha empresa fatura a diferença (Faturamento
                Intermediado)
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* 2. SELETOR GLOBAL DO TIPO DE MARGEM (Orientando Margem Real como Recomendada) */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Regime de Margem de Lucro
              </CardTitle>
              <CardDescription className="text-xs">
                Selecione o modelo de margem padrão para as propostas. O CRM recomenda fortemente a
                Margem Real para precisão financeira.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={activeMarginType}
            onValueChange={(val) => handleChangeMarginType(val as 'margin' | 'kit_percent')}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            <Label
              htmlFor="margin-real"
              className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                activeMarginType === 'margin'
                  ? 'border-emerald-600 bg-emerald-500/5 shadow-xs'
                  : 'border-border/60 hover:border-border'
              }`}
            >
              <RadioGroupItem value="margin" id="margin-real" className="mt-1" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">Margem Real</span>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] px-2 py-0">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Recomendado
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Calculada sobre o <strong>valor final da venda</strong>. Garante que o percentual
                  configurado represente exatamente o lucro operacional da empresa.
                </p>
              </div>
            </Label>

            <Label
              htmlFor="margin-fake"
              className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                activeMarginType === 'kit_percent'
                  ? 'border-amber-600 bg-amber-500/5 shadow-xs'
                  : 'border-border/60 hover:border-border'
              }`}
            >
              <RadioGroupItem value="kit_percent" id="margin-fake" className="mt-1" />
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground">
                    Margem Fake (Markup sobre o Kit)
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] border-amber-500 text-amber-700 bg-amber-50"
                  >
                    Markup Tradicional
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Calculada como percentual direto sobre o custo de aquisição do kit PV.
                </p>
              </div>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* 3. GRUPOS DE CUSTOS (IMPOSTO, COMISSÃO, MARGEM E GRUPOS CUSTOMIZADOS) */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Grupos de Custos e Margens</h3>
          <p className="text-xs text-muted-foreground">
            Cadastre os custos por grupos e aplique faixas sequenciais sem buracos ou sobreposições.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setNewGroupDialogOpen(true)}>
          <FolderPlus className="w-4 h-4 mr-1.5" />
          Novo Grupo de Custo
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Grupo 1: Imposto */}
          {renderGroupCard(
            'Impostos',
            'Alíquotas incidentes sobre a venda (PIS, COFINS, ICMS ou Simples Nacional)',
            <Receipt className="w-5 h-5" />,
            categorizedGroups.tax,
            'imposto',
          )}

          {/* Grupo 2: Comissão */}
          {renderGroupCard(
            'Comissões',
            'Comissões dos consultores de venda, gerentes ou parceiros comerciais',
            <UserCheck className="w-5 h-5" />,
            categorizedGroups.commission,
            'comissao',
          )}

          {/* Grupo 3: Margem */}
          {renderGroupCard(
            activeMarginType === 'margin' ? 'Margem Real' : 'Margem Fake (sobre Kit)',
            activeMarginType === 'margin'
              ? 'Margem de contribuição sobre a venda total (Recomendado)'
              : 'Percentual de markup sobre o preço de compra do kit',
            <TrendingUp className="w-5 h-5" />,
            categorizedGroups.margin,
            'margem',
          )}

          {/* Grupos Customizados Criados pelo Usuário */}
          {categorizedGroups.customGroups.map((grp) =>
            renderGroupCard(
              grp.name,
              'Custos operacionais, engenharia, frete, materiais adicionais ou homologação',
              <Layers className="w-5 h-5" />,
              grp.items,
              'custom',
              grp.name,
            ),
          )}
        </div>
      )}

      {/* MODAL PARA CRIAR NOVO GRUPO CUSTOMIZADO */}
      <Dialog open={newGroupDialogOpen} onOpenChange={setNewGroupDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              Criar Novo Grupo de Custo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Exemplos: Mão de Obra, Engenharia, Frete, Estrutura Adicional, Material CA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Grupo</Label>
              <Input
                placeholder="Ex: Engenharia e Padrão de Entrada"
                value={newGroupNameInput}
                onChange={(e) => setNewGroupNameInput(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewGroupDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCustomGroup}>Continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE ADICIONAR / EDITAR REGRA OU FAIXA */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? `Editar Regra de Custo`
                : hasRange
                  ? `Adicionar Faixa ao Grupo: ${targetGroup === 'custom' ? customGroupName : targetGroup.toUpperCase()}`
                  : `Adicionar Regra ao Grupo: ${targetGroup === 'custom' ? customGroupName : targetGroup.toUpperCase()}`}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure o valor, método de cálculo e defina faixas sequenciais sem buracos ou
              sobreposição.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveItem} className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Identificação da Regra / Nome</Label>
              <Input
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Imposto Estadual, Margem de Venda, Mão de Obra SP"
              />
            </div>

            {/* Método de Cálculo (para grupos customizados o usuário escolhe; nos específicos vem fixado) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Método de Cálculo</Label>
              {targetGroup === 'custom' ? (
                <Select value={formCalcMethod} onValueChange={(v: any) => setFormCalcMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    <SelectItem value="variable">
                      Valor Variável (R$ por módulo, kWp ou kW)
                    </SelectItem>
                    <SelectItem value="rate">Percentual sobre o Valor da Venda (%)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2.5 rounded-lg bg-muted text-xs font-medium text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {targetGroup === 'imposto' && 'Imposto (%)'}
                  {targetGroup === 'comissao' && 'Comissão (% sobre o valor da venda)'}
                  {targetGroup === 'margem' &&
                    (activeMarginType === 'margin'
                      ? 'Margem Real (% sobre a venda total - Recomendado)'
                      : 'Margem Fake (% sobre o valor do Kit)')}
                </div>
              )}
            </div>

            {/* Valor (R$ ou %) para métodos não variáveis */}
            {formCalcMethod !== 'variable' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {formCalcMethod === 'fixed' ? 'Valor Fixo (R$)' : 'Percentual (%)'}
                </Label>
                <Input
                  required
                  type="text"
                  placeholder={formCalcMethod === 'fixed' ? 'Ex: 1500,00' : 'Ex: 12,00'}
                  value={formValue}
                  onChange={(e) => handleNumberInput(setFormValue)(e.target.value)}
                />
              </div>
            )}

            {/* Variável: Base + Multiplicador */}
            {formCalcMethod === 'variable' && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Base de Multiplicação</Label>
                  <Select value={formCalcBase} onValueChange={(v: any) => setFormCalcBase(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="modules">Por módulo (quantidade)</SelectItem>
                      <SelectItem value="kwp">Por kWp (potência do kit)</SelectItem>
                      <SelectItem value="kw">Por kW (potência do inversor)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Multiplicador Unitário (R$)</Label>
                  <Input
                    required
                    type="text"
                    placeholder="Ex: 150,00"
                    value={formMultiplier}
                    onChange={(e) => handleNumberInput(setFormMultiplier)(e.target.value)}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground col-span-2">
                  Fórmula: Multiplicador ×{' '}
                  {formCalcBase === 'modules'
                    ? 'Nº de módulos'
                    : formCalcBase === 'kwp'
                      ? 'kWp total'
                      : 'kW inversores'}{' '}
                  = Custo Final.
                </p>
              </div>
            )}

            {/* Peso do Imposto (somente se método tax) */}
            {formCalcMethod === 'tax' && (
              <div className="space-y-1.5 p-3 rounded-lg bg-muted/40 border">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs font-semibold">Peso do Imposto (%)</Label>
                  <TaxWeightTooltip />
                </div>
                <Input
                  type="text"
                  placeholder="Ex: 100"
                  value={formTaxWeight}
                  onChange={(e) => handleNumberInput(setFormTaxWeight)(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  A soma dos pesos dos impostos ativos deve totalizar 100%.
                </p>
              </div>
            )}

            {/* SEÇÃO DE FAIXA INTELIGENTE SEQUENCIAL */}
            <div className="p-3.5 rounded-xl border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">
                    Diferenciar por Faixa de Potência / Tamanho?
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Faixas contíguas inteligentes: a faixa anterior termina exatamente onde a
                    próxima começa.
                  </p>
                </div>
                <Button
                  type="button"
                  variant={hasRange ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setHasRange(!hasRange)}
                >
                  {hasRange ? 'Com Faixa' : 'Sempre Aplicar (Geral)'}
                </Button>
              </div>

              {hasRange && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Métrica da Faixa</Label>
                    <Select
                      value={rangeMetric}
                      onValueChange={(v: any) => setRangeMetric(v)}
                      disabled={!!editingItem} // Evitar quebrar coerência de faixas existentes
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kwp">Potência do Kit (kWp)</SelectItem>
                        <SelectItem value="modules">Quantidade de Módulos (unidades)</SelectItem>
                        <SelectItem value="kw">Potência do Inversor (kW)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Limite Inferior (Calculado pelo sistema)
                      </Label>
                      <div className="p-2 rounded-md bg-muted text-xs font-medium text-foreground">
                        {currentNextMin === 0
                          ? `A partir de 0 ${rangeMetric === 'modules' ? 'módulos' : rangeMetric.toUpperCase()}`
                          : `Acima de ${formatNumber(currentNextMin)} ${rangeMetric === 'modules' ? 'módulos' : rangeMetric.toUpperCase()}`}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-foreground">
                        Aplicar até (Limite Superior Inclusive)
                      </Label>
                      <Input
                        disabled={isLastUnlimited}
                        type="text"
                        placeholder="Ex: 10,0"
                        value={isLastUnlimited ? 'Sem limite' : rangeUpperLimit}
                        onChange={(e) => handleNumberInput(setRangeUpperLimit)(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="unlimited-checkbox"
                      checked={isLastUnlimited}
                      onChange={(e) => setIsLastUnlimited(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Label
                      htmlFor="unlimited-checkbox"
                      className="text-xs cursor-pointer font-normal"
                    >
                      Esta é a última faixa (aplicar para qualquer valor acima de{' '}
                      {formatNumber(currentNextMin)}{' '}
                      {rangeMetric === 'modules' ? 'módulos' : rangeMetric.toUpperCase()})
                    </Label>
                  </div>

                  <div className="p-2.5 rounded-lg bg-primary/5 text-primary text-[11px] flex items-start gap-1.5">
                    <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Garantia inteligente: Kits de exatos {rangeUpperLimit || '10'}{' '}
                      {rangeMetric === 'modules' ? 'módulos' : rangeMetric.toUpperCase()} cairão
                      nesta faixa (inclusive). A próxima começará imediatamente em &gt;{' '}
                      {rangeUpperLimit || '10'}{' '}
                      {rangeMetric === 'modules' ? 'módulos' : rangeMetric.toUpperCase()}.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Condições Opcionais: Instalação e Colaborador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Instalação (Opcional)</Label>
                <Select value={formInstallationId} onValueChange={setFormInstallationId}>
                  <SelectTrigger>
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

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Colaborador Específico (Opcional)</Label>
                <Select value={formUserId} onValueChange={setFormUserId}>
                  <SelectTrigger>
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
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editingItem ? 'Salvar Alterações' : 'Cadastrar Regra'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
