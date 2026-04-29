import { useState, useEffect } from 'react'
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

const getHspByState = (state: string) => {
  if (!state) return 4.94
  const map: Record<string, number> = {
    AC: 4.8,
    AL: 4.6,
    AP: 4.5,
    AM: 4.8,
    BA: 4.7,
    CE: 5.3,
    DF: 4.5,
    ES: 5.1,
    GO: 5.2,
    MA: 4.6,
    MT: 5.2,
    MS: 5.1,
    MG: 5.3,
    PA: 5.0,
    PB: 4.8,
    PR: 5.2,
    PE: 5.4,
    PI: 5.4,
    RJ: 4.8,
    RN: 5.4,
    RS: 4.5,
    RO: 5.5,
    RR: 4.7,
    SC: 4.3,
    SP: 4.6,
    SE: 5.3,
    TO: 4.7,
  }
  return map[state.toUpperCase()] || 4.94
}

export function SizingTab({ neg, reload }: { neg: any; reload: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const sizing = neg.sizing || {}

  const [distributors, setDistributors] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [inverters, setInverters] = useState<any[]>([])
  const [efficiencyRule, setEfficiencyRule] = useState<any>(null)
  const [fetchedHsp, setFetchedHsp] = useState<number | null>(null)

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
  const [selectedInverterId, setSelectedInverterId] = useState(
    sizing.selected_inverter_id || 'none',
  )

  const [moduleQty, setModuleQty] = useState(
    sizing.module_qty !== undefined ? String(sizing.module_qty) : '',
  )

  const [useRoofFaces, setUseRoofFaces] = useState(neg.use_roof_faces || false)
  const [roofFaces, setRoofFaces] = useState<any[]>(
    neg.roof_faces_data?.length ? neg.roof_faces_data : [{ orientation: '', modules: '' }],
  )

  const [showWarningDialog, setShowWarningDialog] = useState(false)

  useEffect(() => {
    if (!neg.company_id) return

    pb.collection('pv_distributors')
      .getFullList({ filter: `company_id='${neg.company_id}'` })
      .then(setDistributors)
      .catch(console.error)

    pb.collection('pv_modules')
      .getFullList({ filter: `company_id='${neg.company_id}'`, sort: '-power' })
      .then(setModules)
      .catch(console.error)

    pb.collection('pv_inverters')
      .getFullList({ filter: `company_id='${neg.company_id}'`, sort: '-power' })
      .then(setInverters)
      .catch(console.error)

    pb.collection('pv_efficiency_rules')
      .getFirstListItem(`company_id='${neg.company_id}'`)
      .then((rule) => {
        setEfficiencyRule(rule)
        if (sizing.losses === undefined && rule.nominal_loss !== undefined) {
          setLosses(formatNumber(rule.nominal_loss))
        }
      })
      .catch(() => {})
  }, [neg.company_id, sizing.losses])

  useEffect(() => {
    const city = sizing.address_struct?.city || neg.city
    const state = sizing.address_struct?.state || neg.state
    if (city && state) {
      pb.collection('pv_hsp_data')
        .getFirstListItem(`city~'${city}' && state~'${state}'`)
        .then((record) => {
          if (record.annual_avg) setFetchedHsp(record.annual_avg)
        })
        .catch(() => setFetchedHsp(null))
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
    setSelectedInverterId('none')
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

  const hspNum = fetchedHsp || getHspByState(sizing.address_struct?.state || neg.state)
  const nominalLossesNum = parseNumber(losses) || 0
  const additionalLossesNum = enableAdditionalLosses ? parseNumber(additionalLosses) || 0 : 0
  const totalLossesNum = nominalLossesNum + additionalLossesNum
  const avgConsumption = neg.avg_consumption || 0

  const selectedModule = modules.find((m) => m.id === selectedModuleId)
  const modulePowerW = selectedModule ? selectedModule.power : 0

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
    const suggestedModules =
      modulePowerW > 0 ? Math.ceil((suggestedPowerKwp * 1000) / modulePowerW) : 0
    actualModuleQty = moduleQty ? Number(moduleQty) : suggestedModules

    const kitPowerKwp = (actualModuleQty * modulePowerW) / 1000
    const totalLossFactor = 1 - totalLossesNum / 100
    estMonthlyGen = hspNum * kitPowerKwp * totalLossFactor * 30
  }

  const kitPowerKwp = (actualModuleQty * modulePowerW) / 1000
  const isInsufficient = estMonthlyGen > 0 && estMonthlyGen < avgConsumption

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
      const cleanSizing = {
        ...sizing,
        hsp: hspNum,
        losses: nominalLossesNum,
        enable_additional_losses: enableAdditionalLosses,
        additional_losses: additionalLossesNum,
        selected_distributor_id: selectedDistributorId === 'none' ? null : selectedDistributorId,
        selected_module_id: selectedModuleId === 'none' ? null : selectedModuleId,
        selected_inverter_id: selectedInverterId === 'none' ? null : selectedInverterId,
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
                <Label>HSP (Horas de Sol Pico)</Label>
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
                          Utilize este campo para reduzir a geração estimada manualmente em casos de
                          sombreamento, relevo prejudicado ou outros fatores externos específicos do
                          local.
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
                <Label className="cursor-pointer" htmlFor="toggle-faces">
                  Considerar faces do telhado
                </Label>
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
                          placeholder="Módulos"
                          className="h-8 text-sm"
                          value={item.modules}
                          onChange={(e) => {
                            const arr = [...roofFaces]
                            arr[idx].modules = e.target.value
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
              <Label>Distribuidora (Filtro)</Label>
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

            <div className="space-y-2">
              <Label>Módulo Fotovoltaico</Label>
              <Select
                value={selectedModuleId}
                onValueChange={setSelectedModuleId}
                disabled={selectedDistributorId === 'none'}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedDistributorId === 'none'
                        ? 'Selecione o distribuidor primeiro'
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

            <div className="space-y-2">
              <Label>Inversor</Label>
              <Select
                value={selectedInverterId}
                onValueChange={setSelectedInverterId}
                disabled={selectedDistributorId === 'none'}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      selectedDistributorId === 'none'
                        ? 'Selecione o distribuidor primeiro'
                        : 'Selecione o inversor...'
                    }
                  />
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

            {!useRoofFaces && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label>Qtde. de Módulos</Label>
                  <Input
                    type="number"
                    value={moduleQty}
                    onChange={(e) => setModuleQty(e.target.value)}
                    placeholder="Auto"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
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
                <Battery className="w-4 h-4" /> Geração Estimada
              </p>
              <p
                className={`text-xl font-bold ${isInsufficient ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`}
              >
                {estMonthlyGen.toFixed(0)} <span className="text-sm font-normal">kWh/mês</span>
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
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
