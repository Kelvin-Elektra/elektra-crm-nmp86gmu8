import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { updateNegotiation } from '@/services/db'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  Save,
  Sun,
  Battery,
  Settings2,
  Plus,
  Trash2,
  AlertTriangle,
  HelpCircle,
  BarChart3,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getOrFetchHsp } from '@/services/hsp'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function SizingTab({ neg, reload }: { neg: any; reload: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const sizing = neg.sizing || {}

  const [distributors, setDistributors] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [inverters, setInverters] = useState<any[]>([])
  const [efficiencyRule, setEfficiencyRule] = useState<any>(null)
  const [fetchedHspRecord, setFetchedHspRecord] = useState<any>(null)

  const parseNumber = (val: string) => (val ? Number(val.replace(',', '.')) : null)
  const formatNumber = (val: number | string | null | undefined) =>
    val !== null && val !== undefined ? val.toString().replace('.', ',') : ''

  const [losses, setLosses] = useState(
    sizing.losses !== undefined ? formatNumber(sizing.losses) : '23',
  )
  const [enableAdditionalLosses, setEnableAdditionalLosses] = useState(
    sizing.enable_additional_losses || false,
  )
  const [additionalLosses, setAdditionalLosses] = useState(
    sizing.additional_losses !== undefined ? formatNumber(sizing.additional_losses) : '0',
  )

  const [selectedDistributorId, setSelectedDistributorId] = useState(
    sizing.selected_distributor_id || 'none',
  )
  const [selectedModuleId, setSelectedModuleId] = useState(sizing.selected_module_id || 'none')

  const [selectedInverters, setSelectedInverters] = useState<{ id: string; qty: number }[]>(
    sizing.inverters?.length
      ? sizing.inverters
      : sizing.selected_inverter_id
        ? [{ id: sizing.selected_inverter_id, qty: 1 }]
        : [],
  )

  const [manualModuleQty, setManualModuleQty] = useState(
    sizing.module_qty !== undefined ? String(sizing.module_qty) : '',
  )

  const [useRoofFaces, setUseRoofFaces] = useState(neg.use_roof_faces || false)
  const [roofFaces, setRoofFaces] = useState<any[]>(
    neg.roof_faces_data?.length ? neg.roof_faces_data : [{ orientation: '', modules: '' }],
  )

  const [showWarningDialog, setShowWarningDialog] = useState(false)

  useEffect(() => {
    if (!neg.company_id) return

    Promise.all([
      pb.collection('pv_distributors').getFullList({ filter: `company_id='${neg.company_id}'` }),
      pb
        .collection('pv_modules')
        .getFullList({ filter: `company_id='${neg.company_id}'`, sort: '-power' }),
      pb
        .collection('pv_inverters')
        .getFullList({ filter: `company_id='${neg.company_id}'`, sort: '-power' }),
      pb
        .collection('pv_efficiency_rules')
        .getFirstListItem(`company_id='${neg.company_id}'`)
        .catch(() => null),
    ])
      .then(([dists, mods, invs, rule]) => {
        setDistributors(dists)
        setModules(mods)
        setInverters(invs)
        if (rule) {
          setEfficiencyRule(rule)
          if (sizing.losses === undefined && rule.nominal_loss !== undefined) {
            setLosses(formatNumber(rule.nominal_loss))
          }
        }
      })
      .catch(console.error)
  }, [neg.company_id, sizing.losses])

  useEffect(() => {
    const city = sizing.address_struct?.city || neg.city
    const state = sizing.address_struct?.state || neg.state
    if (city && state) {
      getOrFetchHsp(city, state)
        .then((rec) => {
          if (rec) setFetchedHspRecord(rec)
        })
        .catch(() => setFetchedHspRecord(null))
    }
  }, [sizing.address_struct?.city, sizing.address_struct?.state, neg.city, neg.state])

  const handleNumberChange = (val: string, setter: (v: string) => void) => {
    let clean = val.replace(/[^0-9,]/g, '')
    const parts = clean.split(',')
    if (parts.length > 2) {
      clean = parts[0] + ',' + parts.slice(1).join('')
    }
    setter(clean)
  }

  const handleDistributorChange = (val: string) => {
    setSelectedDistributorId(val)
    setSelectedModuleId('none')
    setSelectedInverters([])
  }

  const filteredModules =
    selectedDistributorId === 'none'
      ? []
      : modules.filter((m) => m.distributor_id === selectedDistributorId)
  const filteredInverters =
    selectedDistributorId === 'none'
      ? []
      : inverters.filter((i) => i.distributor_id === selectedDistributorId)

  const orientationOptions = efficiencyRule?.orientation_losses || []

  const hspNum = fetchedHspRecord?.annual_avg || 4.94
  const nominalLossesNum = parseNumber(losses) || 0
  const additionalLossesNum = enableAdditionalLosses ? parseNumber(additionalLosses) || 0 : 0
  const totalLossesNum = nominalLossesNum + additionalLossesNum
  const avgConsumption = neg.avg_consumption || 0

  const selectedModule = modules.find((m) => m.id === selectedModuleId)
  const modulePowerW = selectedModule ? selectedModule.power : 0

  let suggestedModules = 0
  let actualModuleQty = 0
  let estMonthlyGen = 0

  if (useRoofFaces) {
    actualModuleQty = roofFaces.reduce((acc, f) => acc + (Number(f.modules) || 0), 0)
    roofFaces.forEach((face) => {
      const facePowerKwp = ((Number(face.modules) || 0) * modulePowerW) / 1000
      const faceOrient = orientationOptions.find((o: any) => o.orientation === face.orientation)
      const orientLoss = faceOrient ? Number(faceOrient.loss) || 0 : 0
      const totalLossFactor = (1 - totalLossesNum / 100) * (1 - orientLoss / 100)
      estMonthlyGen += hspNum * facePowerKwp * totalLossFactor * 30
    })
  } else {
    const suggestedPowerKwp =
      hspNum > 0 && 1 - totalLossesNum / 100 > 0
        ? avgConsumption / 30 / (hspNum * (1 - totalLossesNum / 100))
        : 0
    suggestedModules = modulePowerW > 0 ? Math.ceil((suggestedPowerKwp * 1000) / modulePowerW) : 0
    actualModuleQty = manualModuleQty ? Number(manualModuleQty) : suggestedModules

    const kitPowerKwp = (actualModuleQty * modulePowerW) / 1000
    const totalLossFactor = 1 - totalLossesNum / 100
    estMonthlyGen = hspNum * kitPowerKwp * totalLossFactor * 30
  }

  const kitPowerKwp = (actualModuleQty * modulePowerW) / 1000
  const isInsufficient = estMonthlyGen > 0 && estMonthlyGen < avgConsumption

  const monthlyGeneration = useMemo(() => {
    return MONTHS.map((monthKey, idx) => {
      const days = DAYS_IN_MONTH[idx]
      const hspM = fetchedHspRecord?.[monthKey] || hspNum
      let gen = 0
      if (useRoofFaces) {
        roofFaces.forEach((face) => {
          const facePowerKwp = ((Number(face.modules) || 0) * modulePowerW) / 1000
          const faceOrient = orientationOptions.find((o: any) => o.orientation === face.orientation)
          const orientLoss = faceOrient ? Number(faceOrient.loss) || 0 : 0
          const totalLossFactor = (1 - totalLossesNum / 100) * (1 - orientLoss / 100)
          gen += hspM * facePowerKwp * totalLossFactor * days
        })
      } else {
        const totalLossFactor = 1 - totalLossesNum / 100
        gen = hspM * kitPowerKwp * totalLossFactor * days
      }
      return { month: MONTH_LABELS[idx], geracao: Math.round(gen) }
    })
  }, [
    fetchedHspRecord,
    hspNum,
    useRoofFaces,
    roofFaces,
    modulePowerW,
    kitPowerKwp,
    totalLossesNum,
    orientationOptions,
  ])

  const chartConfig = {
    geracao: {
      label: 'Geração (kWh)',
      color: 'hsl(var(--primary))',
    },
  }

  const handleAddInverter = () => {
    setSelectedInverters([...selectedInverters, { id: 'none', qty: 1 }])
  }
  const handleRemoveInverter = (idx: number) => {
    const newInvs = [...selectedInverters]
    newInvs.splice(idx, 1)
    setSelectedInverters(newInvs)
  }
  const handleInverterChange = (idx: number, field: string, val: string | number) => {
    const newInvs = [...selectedInverters]
    newInvs[idx] = { ...newInvs[idx], [field]: val }
    setSelectedInverters(newInvs)
  }

  const handleSaveBtn = () => {
    if (isInsufficient) {
      setShowWarningDialog(true)
    } else {
      executeSave()
    }
  }

  const executeSave = async () => {
    setLoading(true)
    setShowWarningDialog(false)
    try {
      const cleanInverters = selectedInverters.filter((i) => i.id !== 'none' && i.qty > 0)

      const cleanSizing = {
        ...sizing,
        hsp: hspNum,
        losses: nominalLossesNum,
        enable_additional_losses: enableAdditionalLosses,
        additional_losses: additionalLossesNum,
        selected_distributor_id: selectedDistributorId === 'none' ? null : selectedDistributorId,
        selected_module_id: selectedModuleId === 'none' ? null : selectedModuleId,
        inverters: cleanInverters,
        selected_inverter_id: cleanInverters.length > 0 ? cleanInverters[0].id : null,
        module_qty: actualModuleQty,
        kit_power_kwp: kitPowerKwp,
        est_monthly_gen: estMonthlyGen,
        totalPower: kitPowerKwp,
      }

      Object.keys(cleanSizing).forEach(
        (key) =>
          cleanSizing[key as keyof typeof cleanSizing] === undefined &&
          delete cleanSizing[key as keyof typeof cleanSizing],
      )

      await updateNegotiation(neg.id, {
        sizing: cleanSizing,
        use_roof_faces: useRoofFaces,
        roof_faces_data: useRoofFaces ? roofFaces : [],
      })
      toast({ title: 'Dimensionamento salvo com sucesso!' })
      reload()
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar dimensionamento',
        description: getErrorMessage(e),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {isInsufficient && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            A geração estimada ({estMonthlyGen.toFixed(0)} kWh/mês) está abaixo do consumo médio (
            {avgConsumption} kWh/mês). A proposta pode não suprir a necessidade do cliente.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Settings2 className="w-5 h-5 text-muted-foreground" />
              Parâmetros de Geração
            </CardTitle>
            <CardDescription>
              Consumo Médio: <strong className="text-primary">{avgConsumption} kWh/mês</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>HSP Anual</Label>
                <Input
                  type="text"
                  value={formatNumber(hspNum)}
                  readOnly
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label>Perdas Nominais (%)</Label>
                <Input
                  type="text"
                  value={formatNumber(nominalLossesNum)}
                  readOnly
                  disabled
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="cursor-pointer" htmlFor="toggle-additional-losses">
                    Habilitar Perdas Adicionais
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Perdas Adicionais / Fatores Locais: Utilize este campo para reduzir a
                          geração estimada manualmente em casos de sombreamento por árvores/prédios
                          próximos, acúmulo de sujeira (soiling) severo ou fatores climáticos
                          atípicos.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="toggle-additional-losses"
                  checked={enableAdditionalLosses}
                  onCheckedChange={setEnableAdditionalLosses}
                />
              </div>
              {enableAdditionalLosses && (
                <div className="space-y-2 animate-fade-in">
                  <Label>Perdas Adicionais (%)</Label>
                  <Input
                    type="text"
                    value={additionalLosses}
                    onChange={(e) => handleNumberChange(e.target.value, setAdditionalLosses)}
                    placeholder="Ex: 5"
                  />
                </div>
              )}
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label className="cursor-pointer" htmlFor="toggle-faces">
                    Considerar faces do telhado
                  </Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Perdas de Face de Telhado: Permite distribuir os módulos em diferentes
                          águas do telhado. O sistema aplicará a perda de eficiência correspondente
                          à orientação (Norte, Sul, Leste, Oeste) e inclinação, ajustando a geração
                          final.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  id="toggle-faces"
                  checked={useRoofFaces}
                  onCheckedChange={setUseRoofFaces}
                />
              </div>

              {useRoofFaces && (
                <div className="space-y-3 bg-muted/30 p-3 rounded-lg border animate-fade-in">
                  {roofFaces.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <Select
                          value={item.orientation}
                          onValueChange={(v) => {
                            const arr = [...roofFaces]
                            arr[idx].orientation = v
                            setRoofFaces(arr)
                          }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Orientação" />
                          </SelectTrigger>
                          <SelectContent>
                            {orientationOptions.map((o: any) => (
                              <SelectItem key={o.orientation} value={o.orientation}>
                                {o.orientation} (-{o.loss}%)
                              </SelectItem>
                            ))}
                            {orientationOptions.length === 0 && (
                              <SelectItem value="nenhuma" disabled>
                                Sem regras config.
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24 space-y-1">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Módulos"
                          className="h-8 text-sm"
                          value={item.modules}
                          onChange={(e) => {
                            const arr = [...roofFaces]
                            const val = Number(e.target.value)
                            arr[idx].modules = val < 0 ? '0' : String(val)
                            setRoofFaces(arr)
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0 mt-1"
                        onClick={() => setRoofFaces(roofFaces.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setRoofFaces([...roofFaces, { orientation: '', modules: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Face
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sun className="w-5 h-5 text-muted-foreground" />
              Seleção de Equipamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Distribuidora</Label>
              <Select value={selectedDistributorId} onValueChange={handleDistributorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o distribuidor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione uma distribuidora</SelectItem>
                  {distributors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <Label className="font-semibold text-base">Módulo Fotovoltaico</Label>
              <Select
                value={selectedModuleId}
                onValueChange={setSelectedModuleId}
                disabled={selectedDistributorId === 'none'}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedDistributorId === 'none'
                        ? 'Selecione a distribuidora'
                        : 'Selecione o módulo...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não selecionado</SelectItem>
                  {filteredModules.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.brand} - {m.name} ({m.power}W)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!useRoofFaces && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Módulos (Sugerido)</Label>
                  <Input
                    type="number"
                    value={suggestedModules}
                    readOnly
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Módulos (Final)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={manualModuleQty}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      if (val >= 0) setManualModuleQty(String(val))
                      else if (e.target.value === '') setManualModuleQty('')
                    }}
                    placeholder="Auto..."
                  />
                </div>
              </div>
            )}

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-base">Inversores</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddInverter}
                  disabled={selectedDistributorId === 'none'}
                >
                  <Plus className="h-4 w-4 mr-2" /> Inversor
                </Button>
              </div>

              {selectedInverters.length === 0 && (
                <div className="text-sm text-muted-foreground italic">
                  Nenhum inversor selecionado.
                </div>
              )}

              {selectedInverters.map((inv, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Select
                      value={inv.id}
                      onValueChange={(val) => handleInverterChange(idx, 'id', val)}
                      disabled={selectedDistributorId === 'none'}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Selecione o inversor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não selecionado</SelectItem>
                        {filteredInverters.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.brand} - {i.name} ({i.power}kW)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min="1"
                      className="h-9 text-center"
                      value={inv.qty}
                      onChange={(e) => handleInverterChange(idx, 'qty', Number(e.target.value))}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive"
                    onClick={() => handleRemoveInverter(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left mb-6">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Arranjo Fotovoltaico</p>
              <p className="text-xl font-semibold">
                {actualModuleQty}{' '}
                <span className="text-sm font-normal text-muted-foreground">x {modulePowerW}W</span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">
                Potência Final do Kit
              </p>
              <p className="text-xl font-bold text-primary">{kitPowerKwp.toFixed(2)} kWp</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1 flex items-center justify-center sm:justify-start gap-1">
                <Battery className="w-4 h-4" /> Geração Estimada Média
              </p>
              <p
                className={`text-xl font-bold ${isInsufficient ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`}
              >
                {estMonthlyGen.toFixed(0)} <span className="text-sm font-normal">kWh/mês</span>
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-primary/10">
            <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
              <BarChart3 className="w-5 h-5 text-primary" /> Estimativa de Geração Mensal
            </h3>
            <div className="h-[250px] w-full">
              <ChartContainer config={chartConfig} className="h-[250px] w-full">
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
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Fonte: Atlas Brasileiro de Energia Solar (2017) - LABREN / CCST / INPE
            </p>
          </div>

          <div className="flex justify-end mt-6 pt-4 border-t border-primary/10">
            <Button onClick={handleSaveBtn} disabled={loading} size="lg">
              <Save className="w-4 h-4 mr-2" /> Salvar Dimensionamento
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Geração Insuficiente</AlertDialogTitle>
            <AlertDialogDescription>
              A geração calculada de {estMonthlyGen.toFixed(0)} kWh não atinge o consumo médio
              informado de {avgConsumption} kWh. Tem certeza que deseja salvar o dimensionamento
              assim mesmo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar Parâmetros</AlertDialogCancel>
            <AlertDialogAction onClick={executeSave}>Salvar Mesmo Assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
