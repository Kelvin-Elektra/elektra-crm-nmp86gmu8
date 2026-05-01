import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Settings2, Sun, Battery, BarChart3, Edit } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { getOrFetchHsp } from '@/services/hsp'
import { SizingGenerationModal } from './SizingGenerationModal'
import { SizingEquipmentModal } from './SizingEquipmentModal'

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
  const sizing = neg.sizing || {}
  const [efficiencyRule, setEfficiencyRule] = useState<any>(null)
  const [hspNum, setHspNum] = useState(4.94)
  const [monthlyGeneration, setMonthlyGeneration] = useState<any[]>([])

  const [genModalOpen, setGenModalOpen] = useState(false)
  const [equipModalOpen, setEquipModalOpen] = useState(false)

  const [modules, setModules] = useState<any[]>([])
  const [inverters, setInverters] = useState<any[]>([])

  useEffect(() => {
    if (!neg.company_id) return
    pb.collection('pv_efficiency_rules')
      .getFirstListItem(`company_id='${neg.company_id}'`)
      .then(setEfficiencyRule)
      .catch(() => {})
    pb.collection('pv_modules')
      .getFullList({ filter: `company_id='${neg.company_id}'` })
      .then(setModules)
    pb.collection('pv_inverters')
      .getFullList({ filter: `company_id='${neg.company_id}'` })
      .then(setInverters)
  }, [neg.company_id])

  useEffect(() => {
    const city = sizing.address_struct?.city || neg.city
    const state = sizing.address_struct?.state || neg.state
    if (city && state) {
      getOrFetchHsp(city, state)
        .then((rec) => {
          if (rec) setHspNum(rec.annual_avg || 4.94)
        })
        .catch(() => {})
    }
  }, [sizing, neg])

  useEffect(() => {
    const totalLossesNum =
      (Number(sizing.losses) || 23) +
      (sizing.enable_additional_losses ? Number(sizing.additional_losses) || 0 : 0)
    const modulePowerW = modules.find((m) => m.id === sizing.selected_module_id)?.power || 0
    const orientationOptions = efficiencyRule?.orientation_losses || []
    const kitPowerKwp = sizing.kit_power_kwp || 0

    const monthly = MONTH_LABELS.map((month, idx) => {
      const days = DAYS_IN_MONTH[idx]
      let gen = 0
      if (neg.use_roof_faces && neg.roof_faces_data) {
        neg.roof_faces_data.forEach((face: any) => {
          const facePowerKwp = ((Number(face.modules) || 0) * modulePowerW) / 1000
          const faceOrient = orientationOptions.find((o: any) => o.orientation === face.orientation)
          const orientLoss = faceOrient ? Number(faceOrient.loss) || 0 : 0
          const totalLossFactor = (1 - totalLossesNum / 100) * (1 - orientLoss / 100)
          gen += hspNum * facePowerKwp * totalLossFactor * days
        })
      } else {
        const totalLossFactor = 1 - totalLossesNum / 100
        gen = hspNum * kitPowerKwp * totalLossFactor * days
      }
      return { month, geracao: Math.round(gen) }
    })
    setMonthlyGeneration(monthly)
  }, [sizing, neg, hspNum, modules, efficiencyRule])

  const estMonthlyGen = monthlyGeneration.reduce((acc, curr) => acc + curr.geracao, 0) / 12 || 0
  const avgConsumption = neg.avg_consumption || 0
  const isInsufficient = estMonthlyGen > 0 && estMonthlyGen < avgConsumption

  const selectedMod = modules.find((m) => m.id === sizing.selected_module_id)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="w-5 h-5 text-muted-foreground" /> Parâmetros de Geração
              </CardTitle>
              <CardDescription>
                Consumo Médio: <strong className="text-primary">{avgConsumption} kWh/mês</strong>
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setGenModalOpen(true)}>
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">HSP Anual:</span>{' '}
              <span className="font-medium">{hspNum.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Perdas Nominais:</span>{' '}
              <span className="font-medium">{sizing.losses || 23}%</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Perdas Adicionais:</span>{' '}
              <span className="font-medium">
                {sizing.enable_additional_losses ? `${sizing.additional_losses}%` : 'Não'}
              </span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-muted-foreground">Faces do Telhado:</span>{' '}
              <span className="font-medium">{neg.use_roof_faces ? 'Ativado' : 'Não'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sun className="w-5 h-5 text-muted-foreground" /> Seleção de Equipamentos
              </CardTitle>
              <CardDescription>Módulos e Inversores</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEquipModalOpen(true)}>
              <Edit className="w-4 h-4 mr-2" /> Editar
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Módulo:</span>
              <span className="font-medium text-right">
                {selectedMod ? `${selectedMod.brand} ${selectedMod.power}W` : 'Nenhum'}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Qtd. Módulos:</span>
              <span className="font-medium text-right">{sizing.module_qty || 0}</span>
            </div>
            <div className="pt-2">
              <span className="text-muted-foreground">Inversores:</span>
              <ul className="mt-1 text-sm">
                {(sizing.inverters || []).map((inv: any, i: number) => {
                  const data = inverters.find((x) => x.id === inv.id)
                  return (
                    <li key={i} className="flex justify-between">
                      <span>{data ? `${data.brand} ${data.power}kW` : 'Desconhecido'}</span>{' '}
                      <span>x{inv.qty}</span>
                    </li>
                  )
                })}
              </ul>
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
                {sizing.module_qty || 0}{' '}
                <span className="text-sm font-normal text-muted-foreground">
                  x {selectedMod?.power || 0}W
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">
                Potência Final do Kit
              </p>
              <p className="text-xl font-bold text-primary">
                {(sizing.kit_power_kwp || 0).toFixed(2)} kWp
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1 flex items-center justify-center sm:justify-start gap-1">
                <Battery className="w-4 h-4" /> Geração Estimada Média
              </p>
              <p
                className={`text-xl font-bold ${isInsufficient ? 'text-destructive' : 'text-green-600'}`}
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

      <SizingGenerationModal
        open={genModalOpen}
        onOpenChange={setGenModalOpen}
        neg={neg}
        reload={reload}
        efficiencyRule={efficiencyRule}
      />
      <SizingEquipmentModal
        open={equipModalOpen}
        onOpenChange={setEquipModalOpen}
        neg={neg}
        reload={reload}
      />
    </div>
  )
}
