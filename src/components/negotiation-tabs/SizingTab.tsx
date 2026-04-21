import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { Save, Sun, Battery, Settings2 } from 'lucide-react'

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

  const parseNumber = (val: string) => (val ? Number(val.replace(',', '.')) : null)
  const formatNumber = (val: number | string | null | undefined) =>
    val !== null && val !== undefined ? val.toString().replace('.', ',') : ''

  const handleNumberChange = (val: string, setter: (v: string) => void) => {
    let clean = val.replace(/[^0-9,]/g, '')
    const parts = clean.split(',')
    if (parts.length > 2) {
      clean = parts[0] + ',' + parts.slice(1).join('')
    }
    setter(clean)
  }

  const recommendedHsp = getHspByState(sizing.address_struct?.state)

  const [hsp, setHsp] = useState(
    sizing.hsp !== undefined ? formatNumber(sizing.hsp) : formatNumber(recommendedHsp),
  )
  const [losses, setLosses] = useState(
    sizing.losses !== undefined ? formatNumber(sizing.losses) : '25',
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
  }, [neg.company_id])

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

  const hspNum = parseNumber(hsp) || recommendedHsp
  const lossesNum = parseNumber(losses) || 25
  const lossFactor = 1 - lossesNum / 100

  const avgConsumption = neg.avg_consumption || 0
  const suggestedPowerKwp =
    hspNum > 0 && lossFactor > 0 ? avgConsumption / 30 / (hspNum * lossFactor) : 0

  const selectedModule = modules.find((m) => m.id === selectedModuleId)
  const modulePowerW = selectedModule ? selectedModule.power : 0
  const suggestedModules =
    modulePowerW > 0 ? Math.ceil((suggestedPowerKwp * 1000) / modulePowerW) : 0

  const actualModuleQty = moduleQty ? Number(moduleQty) : suggestedModules
  const kitPowerKwp = (actualModuleQty * modulePowerW) / 1000
  const estMonthlyGen = hspNum * kitPowerKwp * lossFactor * 30

  const saveSystem = async () => {
    setLoading(true)
    try {
      const cleanSizing = {
        ...sizing,
        hsp: hspNum,
        losses: lossesNum,
        selected_distributor_id: selectedDistributorId === 'none' ? null : selectedDistributorId,
        selected_module_id: selectedModuleId === 'none' ? null : selectedModuleId,
        selected_inverter_id: selectedInverterId === 'none' ? null : selectedInverterId,
        module_qty: actualModuleQty,
        suggested_power_kwp: suggestedPowerKwp,
        kit_power_kwp: kitPowerKwp,
        est_monthly_gen: estMonthlyGen,
        totalPower: kitPowerKwp, // For compatibility
      }

      Object.keys(cleanSizing).forEach(
        (key) =>
          cleanSizing[key as keyof typeof cleanSizing] === undefined &&
          delete cleanSizing[key as keyof typeof cleanSizing],
      )

      await updateNegotiation(neg.id, { sizing: cleanSizing })
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
                <div className="relative">
                  <Input
                    type="text"
                    value={hsp}
                    onChange={(e) => handleNumberChange(e.target.value, setHsp)}
                    placeholder="Ex: 4,94"
                  />
                  <span className="absolute right-3 top-2 text-xs text-muted-foreground bg-background px-1">
                    Rec: {recommendedHsp}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Perdas Nominais (%)</Label>
                <Input
                  type="text"
                  value={losses}
                  onChange={(e) => handleNumberChange(e.target.value, setLosses)}
                  placeholder="Ex: 25"
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-1">Potência Sugerida do Gerador</p>
              <p className="text-3xl font-bold text-primary">
                {suggestedPowerKwp.toFixed(2)} <span className="text-lg font-normal">kWp</span>
              </p>
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

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label>Qtde. de Módulos</Label>
                <Input
                  type="number"
                  value={moduleQty}
                  onChange={(e) => setModuleQty(e.target.value)}
                  placeholder={suggestedModules > 0 ? String(suggestedModules) : '0'}
                />
                {suggestedModules > 0 && (
                  <p className="text-xs text-muted-foreground">Sugerido: {suggestedModules} un.</p>
                )}
              </div>
            </div>
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
              <p className="text-xl font-bold text-green-600 dark:text-green-500">
                {estMonthlyGen.toFixed(0)} <span className="text-sm font-normal">kWh/mês</span>
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button onClick={saveSystem} disabled={loading} size="lg">
              <Save className="w-4 h-4 mr-2" /> Salvar Dimensionamento
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
