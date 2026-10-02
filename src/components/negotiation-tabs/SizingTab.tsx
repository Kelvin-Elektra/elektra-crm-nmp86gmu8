import { useState, useEffect, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Settings2,
  Sun,
  Battery,
  BarChart3,
  Compass,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Save,
  Plus,
  Trash2,
  Info,
  SlidersHorizontal,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { getOrFetchHsp } from '@/services/hsp'
import { updateNegotiation } from '@/services/db'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'
import {
  calculateImmediateModuleRecommendation,
  calculateOccupiedArea,
  calculateSystemMonthlyGeneration,
  RoofFaceItem,
  OrientationLossRule,
} from '@/lib/solar-calculations'
import { getVoltagesForNetwork } from '@/types/electric-network'
import { InverterSelectorWithFilter, SelectedInverterItem } from './InverterSelectorWithFilter'

export function SizingTab({ neg, reload }: { neg: any; reload: () => void }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const sizing = neg.sizing || {}

  // Catálogos e regras
  const [distributors, setDistributors] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [inverters, setInverters] = useState<any[]>([])
  const [utilities, setUtilities] = useState<any[]>([])
  const [efficiencyRule, setEfficiencyRule] = useState<any>(null)
  const [hspData, setHspData] = useState<any>(null)

  // Estado do dimensionamento: Distribuidora e Módulo
  const [selectedDist, setSelectedDist] = useState<string>(sizing.selected_distributor_id || 'all')
  const [selectedModId, setSelectedModId] = useState<string>(sizing.selected_module_id || '')
  const [moduleQty, setModuleQty] = useState<string>(sizing.module_qty?.toString() || '')

  // Estado de Inversores selecionados
  const initialInvs: SelectedInverterItem[] = useMemo(() => {
    if (Array.isArray(sizing.inverters) && sizing.inverters.length > 0) {
      return sizing.inverters.map((i: any) => ({
        id: i.id,
        qty: Number(i.qty || i.quantity || 1),
      }))
    }
    if (sizing.selected_inverter_id) {
      return [{ id: sizing.selected_inverter_id, qty: 1 }]
    }
    return []
  }, [sizing.inverters, sizing.selected_inverter_id])

  const [selectedInvs, setSelectedInvs] = useState<SelectedInverterItem[]>(initialInvs)

  // Seção Avançada recolhida (Regra 6)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Parâmetros técnicos avançados
  const [losses, setLosses] = useState<number>(Number(sizing.losses) || 23)
  const [enableAdditionalLosses, setEnableAdditionalLosses] = useState<boolean>(
    Boolean(sizing.enable_additional_losses),
  )
  const [additionalLosses, setAdditionalLosses] = useState<number>(
    Number(sizing.additional_losses) || 0,
  )

  // Faces de telhado
  const [useRoofFaces, setUseRoofFaces] = useState<boolean>(Boolean(neg.use_roof_faces))
  const [roofFaces, setRoofFaces] = useState<any[]>(
    Array.isArray(neg.roof_faces_data) ? neg.roof_faces_data : [],
  )

  // Loading do salvamento
  const [saving, setSaving] = useState(false)

  // 1. Carregamento inicial do backend
  useEffect(() => {
    if (!neg.company_id) return
    Promise.all([
      pb.collection('pv_distributors').getFullList({
        filter: `company_id='${neg.company_id}'`,
      }),
      pb.collection('pv_modules').getFullList({
        filter: `company_id='${neg.company_id}'`,
        sort: '-power',
      }),
      pb.collection('pv_inverters').getFullList({
        filter: `company_id='${neg.company_id}'`,
        sort: '-power',
      }),
      pb.collection('pv_utilities').getFullList({
        filter: `company_id='${neg.company_id}'`,
      }),
      pb
        .collection('pv_efficiency_rules')
        .getFirstListItem(`company_id='${neg.company_id}'`)
        .catch(() => null),
    ])
      .then(([dists, mods, invs, utils, eff]) => {
        setDistributors(dists)
        setModules(mods)
        setInverters(invs)
        setUtilities(utils)
        if (eff) {
          setEfficiencyRule(eff)
          // Se as perdas nominais da negociação ainda não tiverem sido salvas especificamente
          if (sizing.losses === undefined && eff.nominal_loss !== undefined) {
            setLosses(Number(eff.nominal_loss) || 23)
          }
        }
      })
      .catch((e) => {
        console.error('Erro ao carregar dados do dimensionamento:', e)
      })
  }, [neg.company_id])

  // 2. Busca de HSP com base na cidade/UF
  useEffect(() => {
    const city = sizing.address_struct?.city || neg.city
    const state = sizing.address_struct?.state || neg.state
    if (city && state) {
      getOrFetchHsp(city, state)
        .then((rec) => {
          if (rec) setHspData(rec)
        })
        .catch(() => {})
    }
  }, [sizing.address_struct, neg.city, neg.state])

  // 3. Sincroniza estado inicial se neg mudar externamente
  useEffect(() => {
    if (sizing.selected_module_id && sizing.selected_module_id !== selectedModId) {
      setSelectedModId(sizing.selected_module_id)
    }
    if (sizing.module_qty !== undefined && sizing.module_qty !== null) {
      setModuleQty(sizing.module_qty.toString())
    }
    if (sizing.selected_distributor_id) {
      setSelectedDist(sizing.selected_distributor_id)
    }
  }, [sizing.selected_module_id, sizing.module_qty, sizing.selected_distributor_id])

  // Identificação do módulo selecionado
  const selectedMod = useMemo(() => {
    return modules.find((m) => m.id === selectedModId) || null
  }, [modules, selectedModId])

  const modulePowerW = selectedMod?.power || 0
  const avgConsumption = neg.avg_consumption || 0

  // Perdas totais
  const totalLossesNum = losses + (enableAdditionalLosses ? Number(additionalLosses) || 0 : 0)
  const totalLossFactor = 1 - totalLossesNum / 100

  // HSP
  const hspNum = hspData?.annual_avg || 4.94

  // 4. Recomendação Imediata ao Selecionar Módulo (Regra 1 e 3)
  const immediateRec = useMemo(() => {
    return calculateImmediateModuleRecommendation({
      module: selectedMod,
      avgConsumptionKwh: avgConsumption,
      hspAverage: hspNum,
      nominalLossesPct: losses,
      additionalLossesPct: enableAdditionalLosses ? additionalLosses : 0,
    })
  }, [selectedMod, avgConsumption, hspNum, losses, enableAdditionalLosses, additionalLosses])

  // Quando o consultor escolhe o módulo pela 1ª vez ou altera o módulo (sem quantidade manual definida),
  // preenche imediatamente a quantidade recomendada na tela
  const handleSelectModule = (modId: string) => {
    setSelectedModId(modId)
    const chosenMod = modules.find((m) => m.id === modId) || null
    if (chosenMod) {
      const rec = calculateImmediateModuleRecommendation({
        module: chosenMod,
        avgConsumptionKwh: avgConsumption,
        hspAverage: hspNum,
        nominalLossesPct: losses,
        additionalLossesPct: enableAdditionalLosses ? additionalLosses : 0,
      })
      if (rec.recommendedModules > 0 && !hasEffectiveFaces) {
        setModuleQty(rec.recommendedModules.toString())
      }
    }
  }

  // Orientações cadastradas pela companhia em PvKitSettings (Eficiência PV)
  const companyOrientations: OrientationLossRule[] = useMemo(() => {
    if (Array.isArray(efficiencyRule?.orientation_losses)) {
      return efficiencyRule.orientation_losses
        .filter(
          (o: any) => o && typeof o.orientation === 'string' && o.orientation.trim().length > 0,
        )
        .map((o: any) => ({
          orientation: String(o.orientation).trim(),
          loss: Number(o.loss) || 0,
        }))
    }
    return []
  }, [efficiencyRule])

  const hasConfiguredOrientations = companyOrientations.length > 0

  // Se usar faces e houver faces cadastradas pela companhia, quantidade total vem da soma das faces
  const hasEffectiveFaces = useRoofFaces && hasConfiguredOrientations

  const faceModulesTotal = useMemo(() => {
    if (!hasEffectiveFaces) return 0
    return roofFaces.reduce((acc, f) => acc + (Number(f.modules) || 0), 0)
  }, [hasEffectiveFaces, roofFaces])

  // Inicializa a primeira face caso o usuário ative useRoofFaces e a lista esteja vazia
  useEffect(() => {
    if (hasEffectiveFaces && roofFaces.length === 0 && companyOrientations.length > 0) {
      setRoofFaces([{ orientation: companyOrientations[0].orientation, modules: '' }])
    }
  }, [hasEffectiveFaces, roofFaces.length, companyOrientations])

  useEffect(() => {
    if (hasEffectiveFaces) {
      setModuleQty(faceModulesTotal.toString())
    }
  }, [hasEffectiveFaces, faceModulesTotal])

  // Potência efetiva do kit CC (kWp)
  const effectiveModuleQty = Number(moduleQty) || 0
  const kitPowerKwp =
    effectiveModuleQty > 0 && modulePowerW > 0 ? (effectiveModuleQty * modulePowerW) / 1000 : 0

  // Área ocupada pelos módulos
  const occupiedAreaM2 = useMemo(() => {
    if (!selectedMod || effectiveModuleQty <= 0) return 0
    return calculateOccupiedArea(effectiveModuleQty, {
      height: selectedMod.height,
      width: selectedMod.width,
    })
  }, [selectedMod, effectiveModuleQty])

  // Tensões da Concessionária para compatibilidade (Regra 5)
  const gridVoltages = useMemo(() => {
    const utilRec = utilities.find((u) => u.id === (neg.utility_id || sizing.utility_id))
    const netType = sizing.network_type || ''

    let phase = sizing.phase_voltage || ''
    let line = sizing.line_voltage || ''

    if (utilRec && netType && (!phase || !line)) {
      const cfg = getVoltagesForNetwork(utilRec.network_voltages, netType)
      if (!phase && cfg.phase) phase = cfg.phase
      if (!line && cfg.line) line = cfg.line
    }

    return {
      phaseVoltage: phase,
      lineVoltage: line,
      tension: sizing.tension || sizing.voltage || '',
      concessionaireName: utilRec?.name || neg.concessionaire || '',
      networkType: netType,
    }
  }, [utilities, neg.utility_id, neg.concessionaire, sizing])

  // 5. Cálculo da Geração Mês a Mês com o motor solar centralizado
  const generationCalcResult = useMemo(() => {
    return calculateSystemMonthlyGeneration({
      modulePowerW,
      totalModuleQty: hasEffectiveFaces ? faceModulesTotal : Number(moduleQty) || 0,
      useRoofFaces: hasEffectiveFaces,
      roofFaces: roofFaces as RoofFaceItem[],
      orientationLossRules: companyOrientations,
      nominalLossesPct: losses,
      additionalLossesPct: enableAdditionalLosses ? additionalLosses : 0,
      hspData,
      fallbackHsp: hspNum,
    })
  }, [
    modulePowerW,
    hasEffectiveFaces,
    faceModulesTotal,
    moduleQty,
    roofFaces,
    companyOrientations,
    losses,
    enableAdditionalLosses,
    additionalLosses,
    hspData,
    hspNum,
  ])

  const monthlyGeneration = generationCalcResult.monthlyGeneration
  const estMonthlyGen = generationCalcResult.estMonthlyGen

  const lastSavedGenRef = useRef<number>(Number(sizing?.estimated_monthly_generation) || 0)

  // Salva silenciosamente a geração estimada caso recalculada e estável
  useEffect(() => {
    const rounded = Math.round(estMonthlyGen)
    if (rounded > 0 && neg?.id && rounded !== lastSavedGenRef.current) {
      lastSavedGenRef.current = rounded
      const actualQty = hasEffectiveFaces ? faceModulesTotal : Number(moduleQty) || 0
      const finalKitPower =
        actualQty > 0 && modulePowerW > 0 ? (actualQty * modulePowerW) / 1000 : 0

      updateNegotiation(neg.id, {
        sizing: {
          ...sizing,
          estimated_monthly_generation: rounded,
          monthly_generation: rounded,
          generation_kwh: rounded,
          estimated_generation_kwh: rounded,
          kit_power_kwp: Number(finalKitPower.toFixed(2)),
          totalPower: Number(finalKitPower.toFixed(2)),
          module_qty: actualQty,
          module_quantity: actualQty,
          modules_count: actualQty,
        },
      }).catch(() => {})
    }
  }, [estMonthlyGen, neg?.id, hasEffectiveFaces, faceModulesTotal, moduleQty, modulePowerW, sizing])

  // Filtragem de módulos por distribuidora selecionada
  const filteredModules = useMemo(() => {
    if (!selectedDist || selectedDist === 'all') return modules
    return modules.filter((m) => m.distributor_id === selectedDist)
  }, [modules, selectedDist])

  // Rastreamento de alterações não salvas
  const initialSnapshotRef = useRef<string>('')

  const currentSnapshot = useMemo(() => {
    return JSON.stringify({
      selectedDist,
      selectedModId,
      moduleQty: hasEffectiveFaces ? faceModulesTotal.toString() : moduleQty,
      selectedInvs,
      losses,
      enableAdditionalLosses,
      additionalLosses,
      useRoofFaces,
      roofFaces: hasEffectiveFaces ? roofFaces : [],
    })
  }, [
    selectedDist,
    selectedModId,
    hasEffectiveFaces,
    faceModulesTotal,
    moduleQty,
    selectedInvs,
    losses,
    enableAdditionalLosses,
    additionalLosses,
    useRoofFaces,
    roofFaces,
  ])

  // Inicializa o snapshot base após o carregamento inicial dos dados da negociação
  useEffect(() => {
    if (neg?.id && !initialSnapshotRef.current) {
      initialSnapshotRef.current = currentSnapshot
    }
  }, [neg?.id, currentSnapshot])

  const hasUnsavedChanges = useMemo(() => {
    if (!initialSnapshotRef.current) return false
    return initialSnapshotRef.current !== currentSnapshot
  }, [currentSnapshot])

  // 6. Ação principal: Salvar dimensionamento completo
  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const cleanInvs = selectedInvs.filter((i) => i.id && i.qty > 0)
      const primaryInverterId = cleanInvs.length > 0 ? cleanInvs[0].id : null
      const actualQty = hasEffectiveFaces ? faceModulesTotal : Number(moduleQty) || 0
      const finalKitPower =
        actualQty > 0 && modulePowerW > 0 ? (actualQty * modulePowerW) / 1000 : 0

      // Mantém estrutura da lista de gerações para o motor suportar múltiplos módulos no futuro
      const generationList =
        selectedMod && actualQty > 0
          ? [
              {
                moduleId: selectedMod.id,
                moduleName: `${selectedMod.brand} ${selectedMod.name}`,
                modulePowerW,
                quantity: actualQty,
                powerKwp: finalKitPower,
              },
            ]
          : []

      const roundedMonthlyGen = Math.round(estMonthlyGen)

      const newSizing = {
        ...sizing,
        selected_distributor_id: selectedDist === 'all' ? null : selectedDist,
        selected_module_id: selectedModId || null,
        module_qty: actualQty,
        module_quantity: actualQty,
        modules_count: actualQty,
        kit_power_kwp: Number(finalKitPower.toFixed(2)),
        totalPower: Number(finalKitPower.toFixed(2)),
        power_kwp: Number(finalKitPower.toFixed(2)),
        kwp: Number(finalKitPower.toFixed(2)),
        inverters: cleanInvs,
        selected_inverter_id: primaryInverterId,
        estimated_monthly_generation: roundedMonthlyGen,
        monthly_generation: roundedMonthlyGen,
        generation_kwh: roundedMonthlyGen,
        estimated_generation_kwh: roundedMonthlyGen,
        losses,
        enable_additional_losses: enableAdditionalLosses,
        additional_losses: additionalLosses,
        generation_list: generationList,
      }

      await updateNegotiation(neg.id, {
        sizing: newSizing,
        use_roof_faces: hasEffectiveFaces,
        roof_faces_data: hasEffectiveFaces ? roofFaces : [],
      })

      initialSnapshotRef.current = currentSnapshot

      toast({
        title: 'Dimensionamento salvo com sucesso',
        description: 'Os dados do sistema solar foram atualizados na negociação.',
      })
      reload()
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: e.message || 'Falha ao salvar dimensionamento.',
      })
    } finally {
      setSaving(false)
    }
  }

  // Status de cobertura de consumo
  const isInsufficient = estMonthlyGen > 0 && estMonthlyGen < avgConsumption
  const coverageRatio = avgConsumption > 0 ? Math.round((estMonthlyGen / avgConsumption) * 100) : 0

  return (
    <div className="space-y-6 pb-24">
      {/* Barra de Ações do Topo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-xl p-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500" />
            Dimensionamento do Sistema Fotovoltaico
          </h2>
          <p className="text-xs text-muted-foreground">
            Escolha o módulo para recomendação imediata, configure os inversores com verificação de
            tensão e acompanhe a geração estimada.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {hasUnsavedChanges && (
            <Badge
              variant="outline"
              className="text-xs border-amber-500/50 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
            >
              ● Alterações não salvas
            </Badge>
          )}
          <Button
            onClick={handleSaveAll}
            disabled={saving}
            className={`gap-2 font-medium w-full sm:w-auto ${
              hasUnsavedChanges
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md'
                : 'bg-primary'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Dimensionamento'}
          </Button>
        </div>
      </div>

      {/* SEÇÃO 1: MÓDULOS FOTOVOLTAICOS (Regra 1 e 2) */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-500" /> 1. Módulos Fotovoltaicos
              </CardTitle>
              <CardDescription>
                Selecione o painel solar primeiro para o sistema calcular imediatamente o arranjo
                ideal
              </CardDescription>
            </div>
            {selectedMod && (
              <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto">
                {selectedMod.power}Wp · {selectedMod.brand}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro de Distribuidora (opcional) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Distribuidora (Filtro)
              </Label>
              <Select value={selectedDist} onValueChange={setSelectedDist}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todas as distribuidoras" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as distribuidoras</SelectItem>
                  {distributors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seleção do Modelo de Módulo (Regra 1: Módulo Primeiro) */}
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Modelo do Painel Fotovoltaico *</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  1 modelo por proposta
                </span>
              </Label>
              <Select value={selectedModId || 'none'} onValueChange={handleSelectModule}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Escolha um módulo do catálogo..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="none">Selecione um módulo...</SelectItem>
                  {filteredModules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.brand} - {m.name} ({m.power}Wp)
                      {m.annual_degradation
                        ? ` · Degradação: ${String(m.annual_degradation).replace('.', ',')}% a.a.`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CARD DA RECOMENDAÇÃO IMEDIATA (Regra 1) */}
          {selectedMod ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                Recomendação Imediata do Sistema
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                  <p className="text-xs text-muted-foreground">Consumo Alvo</p>
                  <p className="text-base font-bold text-foreground">
                    {Math.round(avgConsumption)} kWh/mês
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                  <p className="text-xs text-muted-foreground">Qtd. Recomendada</p>
                  <p className="text-base font-bold text-primary">
                    {immediateRec.recommendedModules} painéis
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                  <p className="text-xs text-muted-foreground">Potência Calculada</p>
                  <p className="text-base font-bold text-foreground">
                    {immediateRec.systemPowerKwp.toFixed(2)} kWp
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-background/80 border border-border/50">
                  <p className="text-xs text-muted-foreground">Área Estimada</p>
                  <p className="text-base font-bold text-foreground">
                    {occupiedAreaM2 > 0 ? `${occupiedAreaM2} m²` : '—'}
                  </p>
                </div>
              </div>

              {/* Ajuste manual ou adoção da recomendação */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-primary/20">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Label className="text-xs font-semibold whitespace-nowrap">
                    Quantidade adotada:
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    disabled={hasEffectiveFaces}
                    value={moduleQty}
                    onChange={(e) => setModuleQty(e.target.value)}
                    className="w-24 h-8 text-center font-bold"
                  />
                  {hasEffectiveFaces && (
                    <span className="text-xs text-muted-foreground">
                      (definida na soma das faces de orientação)
                    </span>
                  )}
                </div>

                {!hasEffectiveFaces &&
                  immediateRec.recommendedModules > 0 &&
                  Number(moduleQty) !== immediateRec.recommendedModules && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModuleQty(immediateRec.recommendedModules.toString())}
                      className="text-xs h-8 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Usar recomendação ({immediateRec.recommendedModules} painéis)
                    </Button>
                  )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Selecione um modelo de módulo acima para ver a recomendação automática de quantidade,
              potência e área ocupada.
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO 2: INVERSORES (Regra 2, 4 e 5) */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" /> 2. Inversores e Casamento Elétrico
          </CardTitle>
          <CardDescription>
            Escolha os inversores compatíveis com a rede da concessionária e acompanhe a relação
            CC/CA
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <InverterSelectorWithFilter
            inverters={inverters}
            distributors={distributors}
            selectedDistributorId={selectedDist === 'all' ? null : selectedDist}
            selectedInverters={selectedInvs}
            onChangeSelectedInverters={setSelectedInvs}
            totalDcPowerKwp={kitPowerKwp}
            gridVoltages={gridVoltages}
          />
        </CardContent>
      </Card>

      {/* SEÇÃO 3: RESUMO DE GERAÇÃO E ARRANJO */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 text-center sm:text-left mb-6">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Arranjo de Módulos</p>
              <p className="text-xl font-bold">
                {effectiveModuleQty}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  x {modulePowerW}Wp
                </span>
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Potência do Kit (CC)</p>
              <p className="text-xl font-bold text-primary">{kitPowerKwp.toFixed(2)} kWp</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center justify-center sm:justify-start gap-1">
                <Battery className="w-4 h-4 text-emerald-600" /> Geração Média Estimada
              </p>
              <p
                className={`text-xl font-bold ${
                  isInsufficient ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {Math.round(estMonthlyGen)} <span className="text-sm font-normal">kWh/mês</span>
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Cobertura do Consumo</p>
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <p
                  className={`text-xl font-bold ${
                    coverageRatio < 100
                      ? 'text-amber-600'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {coverageRatio}%
                </p>
                {coverageRatio >= 100 ? (
                  <Badge className="bg-emerald-600 text-white text-[10px] gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Suficiente
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px] gap-1">
                    <AlertTriangle className="w-3 h-3" /> Déficit
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-primary/10">
            <h3 className="flex items-center gap-2 font-semibold text-base mb-4">
              <BarChart3 className="w-5 h-5 text-primary" /> Curva de Geração Mensal Estimada
            </h3>
            <div className="h-[250px] w-full">
              <ChartContainer
                config={{ geracao: { label: 'Geração (kWh)', color: 'hsl(var(--primary))' } }}
                className="h-[250px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyGeneration}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--muted))"
                    />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="geracao" fill="var(--color-geracao)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 4: PARÂMETROS TÉCNICOS AVANÇADOS (Regra 6: Recolhida por padrão) */}
      <Card className="border-border/70 shadow-sm">
        <CardHeader
          className="cursor-pointer select-none py-4 hover:bg-muted/20 transition-colors"
          onClick={() => setAdvancedOpen(!advancedOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">
                  Parâmetros Avançados (Faces de Orientação e Perdas)
                </CardTitle>
                <CardDescription>
                  {advancedOpen
                    ? 'Recolher parâmetros técnicos adicionais'
                    : 'Ajuste perdas térmicas, sujeira, HSP e divisão por faces de telhado'}
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="gap-1.5">
              {advancedOpen ? (
                <>
                  <ChevronUp className="w-4 h-4" /> Recolher
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" /> Expandir
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        {advancedOpen && (
          <CardContent className="space-y-6 pt-2 border-t">
            {/* Parâmetros de Perdas e Irradiação */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <SlidersHorizontal className="w-4 h-4 text-primary" /> Perdas Globais e Irradiação
                (HSP)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">HSP Médio Anual (kWh/m²/dia)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={hspNum}
                    readOnly
                    className="bg-muted/50 cursor-not-allowed font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Origem: Atlas Solarimétrico CRESESB para {neg.city || 'região'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Perdas Nominais (%)</Label>
                  <Input
                    type="number"
                    value={losses}
                    onChange={(e) => setLosses(Number(e.target.value) || 0)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Perdas térmicas, fiação, sujeira (padrão 23%)
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Perdas Adicionais (%)</Label>
                    <Switch
                      checked={enableAdditionalLosses}
                      onCheckedChange={setEnableAdditionalLosses}
                    />
                  </div>
                  <Input
                    type="number"
                    disabled={!enableAdditionalLosses}
                    value={additionalLosses}
                    onChange={(e) => setAdditionalLosses(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Sombreamento específico, microclima etc.
                  </p>
                </div>
              </div>
            </div>

            {/* Divisão por Faces do Telhado */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Compass className="w-4 h-4 text-primary" /> Faces de Orientação do Telhado
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Distribua os módulos entre as faces cadastradas na companhia para aplicar perdas
                    reais por orientação
                  </p>
                </div>
                {hasConfiguredOrientations && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="roof-faces-switch" className="text-xs cursor-pointer">
                      Considerar faces
                    </Label>
                    <Switch
                      id="roof-faces-switch"
                      checked={useRoofFaces}
                      onCheckedChange={(checked) => {
                        setUseRoofFaces(checked)
                        if (checked && roofFaces.length === 0 && companyOrientations.length > 0) {
                          setRoofFaces([
                            { orientation: companyOrientations[0].orientation, modules: '' },
                          ])
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {!hasConfiguredOrientations ? (
                <div className="p-4 rounded-xl border border-dashed bg-muted/20 space-y-3 text-sm">
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">
                        Nenhuma face de orientação cadastrada pela companhia
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Para habilitar a divisão de módulos por face do telhado com cálculo real de
                        perda, configure as orientações e percentuais na tela de Eficiência PV da
                        companhia.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/configuracoes-kit-pv?tab=eficiencia')}
                    className="gap-2 text-xs h-8 border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Cadastrar em Configurações Kit PV (Eficiência PV)
                  </Button>
                </div>
              ) : useRoofFaces ? (
                <div className="space-y-3 bg-muted/30 p-4 rounded-xl border">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-foreground">
                      Faces cadastradas pela companhia:
                    </span>
                    <span className="text-muted-foreground">
                      Total de módulos nas faces:{' '}
                      <strong className="text-foreground">{faceModulesTotal}</strong>
                      {selectedMod && faceModulesTotal > 0 && (
                        <span className="ml-1 text-[11px]">
                          ({((faceModulesTotal * modulePowerW) / 1000).toFixed(2)} kWp)
                        </span>
                      )}
                    </span>
                  </div>

                  {roofFaces.map((face, idx) => {
                    const rule = companyOrientations.find(
                      (o) => o.orientation.toLowerCase() === String(face.orientation).toLowerCase(),
                    )
                    const lossVal = rule ? Number(rule.loss) || 0 : 0

                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          value={face.orientation}
                          onValueChange={(val) => {
                            const next = [...roofFaces]
                            next[idx].orientation = val
                            setRoofFaces(next)
                          }}
                        >
                          <SelectTrigger className="flex-1 h-8 text-xs">
                            <SelectValue placeholder="Selecione a face cadastrada" />
                          </SelectTrigger>
                          <SelectContent>
                            {companyOrientations.map((o) => (
                              <SelectItem
                                key={o.orientation}
                                value={o.orientation}
                                className="text-xs"
                              >
                                {o.orientation} {o.loss ? `(Perda: -${o.loss}%)` : '(Perda: 0%)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            placeholder="Módulos"
                            value={face.modules}
                            onChange={(e) => {
                              const next = [...roofFaces]
                              next[idx].modules = e.target.value
                              setRoofFaces(next)
                            }}
                            className="w-24 h-8 text-xs text-center font-semibold"
                          />
                          <span className="text-xs text-muted-foreground">painéis</span>
                        </div>

                        <Badge
                          variant="secondary"
                          className="text-[11px] font-mono h-8 px-2 flex items-center justify-center shrink-0 min-w-[70px]"
                        >
                          {lossVal > 0 ? `-${lossVal}%` : '0%'}
                        </Badge>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          disabled={roofFaces.length <= 1}
                          onClick={() => setRoofFaces(roofFaces.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })}

                  <div className="flex items-center justify-start pt-2 border-t border-border/50 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1"
                      onClick={() => {
                        const unused = companyOrientations.find(
                          (co) =>
                            !roofFaces.some(
                              (rf) => rf.orientation.toLowerCase() === co.orientation.toLowerCase(),
                            ),
                        )
                        const nextOrient = unused
                          ? unused.orientation
                          : companyOrientations[0].orientation
                        setRoofFaces([...roofFaces, { orientation: nextOrient, modules: '' }])
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar Outra Face
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Atalho para a página da Proposta - Aba Financeiro */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-base text-foreground">
                Análise Financeira e Retorno do Investimento
              </h3>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Os índices financeiros (TIR anual, Múltiplo do Investimento, Payback e projeção de 25
              anos com cronologia do Fio B e reajuste por concessionária) são gerados
              automaticamente na aba dedicada dentro da proposta.
            </p>
          </div>
          <Button
            onClick={() => navigate(`/negociacoes/${neg.id}/proposta?tab=financeiro`)}
            className="gap-2 shrink-0"
          >
            Ver Análise Financeira <ArrowRight className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Barra Fixa Sticky no Rodapé para salvar com destaque quando há alterações não salvas */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 left-4 right-4 md:left-72 md:right-8 z-40 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 text-white rounded-xl p-4 shadow-2xl border border-amber-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/20 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm text-amber-300 flex items-center gap-2">
                  Você possui alterações não salvas no dimensionamento
                </p>
                <p className="text-xs text-slate-300">
                  Salve agora para atualizar a potência, módulos e geração estimada na negociação.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Desfazer recarregando
                  reload()
                  initialSnapshotRef.current = ''
                }}
                disabled={saving}
                className="text-xs text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
              >
                Descartar alterações
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={saving}
                size="sm"
                className="gap-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 shadow-lg"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
