import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Percent } from 'lucide-react'
import { TaxWeightTooltip } from '@/components/pv-kit/TaxWeightTooltip'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export function TaxConfigCard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [tax1Name, setTax1Name] = useState('Produto')
  const [tax1Weight, setTax1Weight] = useState(100)
  const [tax2Name, setTax2Name] = useState('Serviço')
  const [tax2Weight, setTax2Weight] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.company_id) return
    pb.collection('proposal_settings')
      .getFirstListItem(`company_id = '${user.company_id}'`)
      .then((record) => {
        setSettingsId(record.id)
        if (record.tax1_name) setTax1Name(record.tax1_name)
        if (record.tax1_weight != null) setTax1Weight(record.tax1_weight)
        if (record.tax2_name) setTax2Name(record.tax2_name)
        if (record.tax2_weight != null) setTax2Weight(record.tax2_weight)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const handleWeightChange = (taxNum: 1 | 2, weight: number) => {
    if (taxNum === 1) {
      setTax1Weight(weight)
      setTax2Weight(100 - weight)
    } else {
      setTax2Weight(weight)
      setTax1Weight(100 - weight)
    }
  }

  const saveAll = async () => {
    if (!user?.company_id) return
    try {
      const data = {
        tax1_name: tax1Name,
        tax1_weight: tax1Weight,
        tax2_name: tax2Name,
        tax2_weight: tax2Weight,
      }
      if (settingsId) {
        await pb.collection('proposal_settings').update(settingsId, data)
      } else {
        const record = await pb.collection('proposal_settings').create({
          company_id: user.company_id,
          ...data,
        })
        setSettingsId(record.id)
      }
      toast({ title: 'Configuração de impostos salva.' })
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao salvar configuração.' })
    }
  }

  if (loading) return null

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center">
          <Percent className="w-5 h-5 mr-2 text-primary" />
          Configuração de Incidência de Impostos
          <span className="ml-2">
            <TaxWeightTooltip />
          </span>
        </CardTitle>
        <CardDescription>
          Defina os pesos de incidência entre Produto e Serviço para o cálculo de impostos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Imposto 1</Label>
              <span className="text-2xl font-bold text-primary">{tax1Weight}%</span>
            </div>
            <Input
              value={tax1Name}
              onChange={(e) => setTax1Name(e.target.value)}
              placeholder="Nome do imposto"
              className="bg-background"
            />
            <Slider
              value={[tax1Weight]}
              onValueChange={([v]) => handleWeightChange(1, v)}
              max={100}
              step={5}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Imposto 2</Label>
              <span className="text-2xl font-bold text-primary">{tax2Weight}%</span>
            </div>
            <Input
              value={tax2Name}
              onChange={(e) => setTax2Name(e.target.value)}
              placeholder="Nome do imposto"
              className="bg-background"
            />
            <Slider
              value={[tax2Weight]}
              onValueChange={([v]) => handleWeightChange(2, v)}
              max={100}
              step={5}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-6 rounded-full overflow-hidden bg-muted flex">
            <div
              className="bg-primary h-full transition-all duration-300 flex items-center justify-center text-xs text-white font-medium"
              style={{ width: `${tax1Weight}%` }}
            >
              {tax1Weight > 15 ? `${tax1Weight}%` : ''}
            </div>
            <div
              className="bg-primary/40 h-full transition-all duration-300 flex items-center justify-center text-xs text-white font-medium"
              style={{ width: `${tax2Weight}%` }}
            >
              {tax2Weight > 15 ? `${tax2Weight}%` : ''}
            </div>
          </div>
          <Button size="sm" onClick={saveAll}>
            Salvar Pesos
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          A soma dos pesos deve totalizar 100%. Ajuste um slider e o outro será atualizado
          automaticamente.
        </p>
      </CardContent>
    </Card>
  )
}
