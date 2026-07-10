import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrendingUp, PiggyBank, Receipt, Calculator } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { updateNegotiation } from '@/services/db'
import {
  calculateFinancialProjection,
  fetchTariffRate,
  fetchLatestProposalPrice,
  DEFAULT_SIMULTANEITY_FACTORS,
  CONSUMER_CATEGORIES,
  DEFAULT_TARIFF_RATE,
} from '@/lib/financial-analysis'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function FinancialAnalysisCard({
  neg,
  estMonthlyGen,
  reload,
}: {
  neg: any
  estMonthlyGen: number
  reload: () => void
}) {
  const { toast } = useToast()
  const sizing = neg.sizing || {}

  const [consumerCategory, setConsumerCategory] = useState(sizing.consumer_category || '')
  const [simultaneityFactor, setSimultaneityFactor] = useState(
    sizing.simultaneity_factor != null
      ? sizing.simultaneity_factor
      : DEFAULT_SIMULTANEITY_FACTORS[sizing.consumer_category] || 30,
  )
  const [tariffRate, setTariffRate] = useState(DEFAULT_TARIFF_RATE)
  const [systemPrice, setSystemPrice] = useState(0)

  useEffect(() => {
    const loadData = async () => {
      const tariff = await fetchTariffRate(neg.utility_id, sizing.consumer_category)
      setTariffRate(tariff)
      const price = await fetchLatestProposalPrice(neg.id)
      setSystemPrice(price || (Number(sizing.kit_power_kwp) || 0) * 4000)
    }
    loadData()
  }, [neg.id, neg.utility_id])

  const sizingKey = JSON.stringify(neg.sizing || {})
  useEffect(() => {
    const s = JSON.parse(sizingKey)
    setConsumerCategory(s.consumer_category || '')
    setSimultaneityFactor(
      s.simultaneity_factor != null
        ? s.simultaneity_factor
        : DEFAULT_SIMULTANEITY_FACTORS[s.consumer_category] || 30,
    )
  }, [sizingKey])

  const handleCategoryChange = (category: string) => {
    setConsumerCategory(category)
    const defaultFactor = DEFAULT_SIMULTANEITY_FACTORS[category] || 30
    setSimultaneityFactor(defaultFactor)
    saveFinancialData(category, defaultFactor)
    fetchTariffRate(neg.utility_id, category).then(setTariffRate)
  }

  const handleFactorChange = (val: string) => {
    const num = Math.min(100, Math.max(0, Number(val) || 0))
    setSimultaneityFactor(num)
  }

  const handleFactorBlur = () => {
    saveFinancialData(consumerCategory, simultaneityFactor)
  }

  const saveFinancialData = async (category: string, factor: number) => {
    try {
      await updateNegotiation(neg.id, {
        sizing: {
          ...neg.sizing,
          consumer_category: category,
          simultaneity_factor: factor,
        },
      })
      toast({ description: 'Dados financeiros salvos' })
      reload()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar' })
    }
  }

  const avgConsumption = neg.avg_consumption || 0
  const projection = calculateFinancialProjection({
    avgConsumption,
    estMonthlyGen,
    simultaneityFactor,
    tariffRate,
    systemPrice,
  })

  const roiLabel =
    projection.roiMonths > 0
      ? [
          projection.roiYears > 0 ? `${projection.roiYears} ano(s)` : '',
          projection.roiYears > 0 && projection.roiRemainingMonths > 0 ? ' e ' : '',
          projection.roiRemainingMonths > 0 ? `${projection.roiRemainingMonths} mês(es)` : '',
        ].join('')
      : ''

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="w-5 h-5 text-primary" />
          Análise Financeira e Retorno do Investimento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Categoria do Consumidor</Label>
            <Select value={consumerCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {CONSUMER_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fator de Simultaneidade (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={simultaneityFactor}
              onChange={(e) => handleFactorChange(e.target.value)}
              onBlur={handleFactorBlur}
            />
            <p className="text-xs text-muted-foreground">
              Percentual da geração consumido na hora (autoconsumo)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/30 rounded-lg p-4 border">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Conta Atual</span>
            </div>
            <p className="text-2xl font-bold">{BRL.format(projection.currentMonthlyCost)}</p>
            <p className="text-xs text-muted-foreground mt-1">por mês</p>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Conta Futura</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {BRL.format(projection.futureMonthlyBill)}
            </p>
            <p className="text-xs text-green-700/70 mt-1">estimada por mês</p>
          </div>

          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Economia Mensal</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {BRL.format(projection.monthlySavings)}
            </p>
            <p className="text-xs text-green-700/70 mt-1">
              {BRL.format(projection.annualSavings)} / ano
            </p>
          </div>
        </div>

        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="font-semibold">Retorno do Investimento (ROI)</span>
            </div>
            <div className="text-right">
              {roiLabel ? (
                <>
                  <span className="text-2xl font-bold text-primary">{roiLabel}</span>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baseado em investimento de {BRL.format(systemPrice)}
                  </p>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {systemPrice > 0
                    ? 'Economia insuficiente para calcular ROI'
                    : 'Gere uma proposta para calcular o ROI'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Geração Mensal</span>
            <span className="font-medium">{Math.round(estMonthlyGen)} kWh</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Autoconsumo</span>
            <span className="font-medium">{Math.round(projection.selfConsumed)} kWh</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Exportado à rede</span>
            <span className="font-medium">{Math.round(projection.exportedToGrid)} kWh</span>
          </div>
          <div className="flex flex-col">
            <span className="text-muted-foreground text-xs">Tarifa Utilizada</span>
            <span className="font-medium">
              {BRL.format(tariffRate)} <span className="text-xs text-muted-foreground">/kWh</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
