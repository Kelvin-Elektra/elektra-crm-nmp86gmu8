import { useState } from 'react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Settings2, Zap, Save, CheckCircle2 } from 'lucide-react'

export function SizingTab({ neg, reload }: { neg: any; reload: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const sizing = neg.sizing || {}

  const [distributor, setDistributor] = useState(sizing.distributor || 'aldo')
  const [modulePower, setModulePower] = useState(sizing.modulePower || '550')
  const [inverterBrand, setInverterBrand] = useState(sizing.inverterBrand || 'growatt')

  const avgConsumption = neg.avg_consumption || 0
  const computedModules =
    avgConsumption > 0 && Number(modulePower) > 0
      ? Math.ceil(avgConsumption / (Number(modulePower) * 0.12))
      : 0

  const [adjustedModules, setAdjustedModules] = useState<number>(
    sizing.adjustedModules || computedModules,
  )
  const [selectedInverter, setSelectedInverter] = useState(
    sizing.selectedInverter || 'Growatt MIN 5000TL-X',
  )

  const totalPower = ((adjustedModules || computedModules) * Number(modulePower)) / 1000

  const saveInputs = async () => {
    setLoading(true)
    try {
      const cleanSizing = JSON.parse(
        JSON.stringify({
          ...sizing,
          distributor,
          modulePower: Number(modulePower) || 0,
          inverterBrand,
        }),
      )
      await pb.collection('negotiations').update(neg.id, {
        sizing: cleanSizing,
      })
      toast({ title: 'Parâmetros salvos' })
      reload()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao salvar' })
    } finally {
      setLoading(false)
    }
  }

  const saveSystem = async () => {
    setLoading(true)
    try {
      const cleanSizing = JSON.parse(
        JSON.stringify({
          ...sizing,
          adjustedModules: Number(adjustedModules) || 0,
          selectedInverter,
          totalPower: Number(totalPower) || 0,
        }),
      )
      await pb.collection('negotiations').update(neg.id, {
        sizing: cleanSizing,
      })
      toast({ title: 'Kit definido e salvo com sucesso!' })
      reload()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao salvar' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Tabs defaultValue="entradas" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="entradas">
          <Settings2 className="w-4 h-4 mr-2" /> Entradas Técnicas
        </TabsTrigger>
        <TabsTrigger value="sistema">
          <Zap className="w-4 h-4 mr-2" /> Definir Sistema
        </TabsTrigger>
      </TabsList>

      <TabsContent value="entradas">
        <Card>
          <CardHeader>
            <CardTitle>Configuração de Equipamentos</CardTitle>
            <CardDescription>
              Defina as preferências de marca e potência para o dimensionamento automático.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Distribuidor Preferencial</Label>
                <Select value={distributor} onValueChange={setDistributor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aldo">Aldo Solar</SelectItem>
                    <SelectItem value="wec">WEC Solar</SelectItem>
                    <SelectItem value="souenergy">Sou Energy</SelectItem>
                    <SelectItem value="fotus">Fotus Gerador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Potência do Módulo (W)</Label>
                <Input
                  type="number"
                  value={modulePower}
                  onChange={(e) => setModulePower(e.target.value)}
                  placeholder="Ex: 550"
                />
              </div>
              <div className="space-y-2">
                <Label>Marca do Inversor</Label>
                <Select value={inverterBrand} onValueChange={setInverterBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="growatt">Growatt</SelectItem>
                    <SelectItem value="deye">Deye</SelectItem>
                    <SelectItem value="fronius">Fronius</SelectItem>
                    <SelectItem value="sungrow">Sungrow</SelectItem>
                    <SelectItem value="hoymiles">Hoymiles</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={saveInputs} disabled={loading}>
                <Save className="w-4 h-4 mr-2" /> Salvar Parâmetros
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sistema">
        <Card>
          <CardHeader>
            <CardTitle>Dimensionamento do Gerador</CardTitle>
            <CardDescription>
              Consumo Base: <strong className="text-primary">{avgConsumption} kWh/mês</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b pb-6">
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">Arranjo Fotovoltaico</h3>
                <div className="space-y-2">
                  <Label>Módulos Calculados (Automático)</Label>
                  <Input
                    value={`${computedModules} un. de ${modulePower}W`}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ajuste Manual de Módulos</Label>
                  <Input
                    type="number"
                    value={adjustedModules || computedModules}
                    onChange={(e) => setAdjustedModules(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ajuste manualmente a quantidade para gerar mais ou menos energia.
                  </p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm">Potência Total do Gerador:</p>
                  <p className="text-2xl font-bold text-primary">{totalPower.toFixed(2)} kWp</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">Inversor / Microinversor</h3>
                <div className="space-y-2">
                  <Label>Modelo Selecionado</Label>
                  <Select value={selectedInverter} onValueChange={setSelectedInverter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o Inversor..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Growatt MIN 5000TL-X">
                        Growatt MIN 5000TL-X (5kW)
                      </SelectItem>
                      <SelectItem value="Growatt MIN 8000TL-X">
                        Growatt MIN 8000TL-X (8kW)
                      </SelectItem>
                      <SelectItem value="Deye SUN-5K-G">Deye SUN-5K-G (5kW)</SelectItem>
                      <SelectItem value="Deye SUN-8K-G">Deye SUN-8K-G (8kW)</SelectItem>
                      <SelectItem value="Fronius Primo 5.0-1">Fronius Primo 5.0-1 (5kW)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-sm text-muted-foreground">
                Revise os dados antes de salvar o kit.
              </div>
              <Button
                onClick={saveSystem}
                disabled={loading}
                size="lg"
                className="w-full md:w-auto"
              >
                <CheckCircle2 className="w-5 h-5 mr-2" /> Montar Kit
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
