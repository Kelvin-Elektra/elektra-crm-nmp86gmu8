import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingUp,
  Receipt,
  Calculator,
  Zap,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  FileText,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateNegotiation } from '@/services/db'
import pb from '@/lib/pocketbase/client'
import { NumericInput } from '@/components/ui/numeric-input'
import { cn } from '@/lib/utils'
import {
  calculateFinancialProjection,
  fetchTariffDetails,
  fetchLatestProposalPrice,
  getFioBScalingFactor,
  DEFAULT_SIMULTANEITY_FACTORS,
  CONSUMER_CATEGORIES,
  FIO_B_DEFAULT_RATE,
  type TariffDetails,
} from '@/lib/financial-analysis'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const ICMS_LABELS: Record<string, string> = {
  none: 'Sem Isenção',
  te: 'Isento TE',
  tusd: 'Isento TUSD',
  both: 'Isento Ambos',
}

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
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [consumerCategory, setConsumerCategory] = useState(
    neg.consumer_category || neg.sizing?.consumer_category || '',
  )
  const [simultaneityFactor, setSimultaneityFactor] = useState(
    neg.simultaneity_factor != null
      ? neg.simultaneity_factor
      : neg.sizing?.simultaneity_factor != null
        ? neg.sizing?.simultaneity_factor
        : DEFAULT_SIMULTANEITY_FACTORS[neg.consumer_category || neg.sizing?.consumer_category] ||
          30,
  )
  const [publicLightingFee, setPublicLightingFee] = useState(
    neg.public_lighting_fee != null ? neg.public_lighting_fee : 0,
  )
  const [tariffDetails, setTariffDetails] = useState<TariffDetails>({
    te: 0,
    tusd: 0,
    icms_rate: 0,
    icms_exemption: 'none',
    fio_b_value: 0,
  })
  const [systemPrice, setSystemPrice] = useState(0)
  const [tariffFound, setTariffFound] = useState(true)
  const [defaultFactors, setDefaultFactors] = useState<Record<string, number>>(
    DEFAULT_SIMULTANEITY_FACTORS,
  )

  useEffect(() => {
    if (!neg.company_id) return
    pb.collection('proposal_settings')
      .getFirstListItem(`company_id='${neg.company_id}'`)
      .then((record) => {
        if (record.pricing?.simultaneity_factors) {
          setDefaultFactors({
            ...DEFAULT_SIMULTANEITY_FACTORS,
            ...record.pricing.simultaneity_factors,
          })
        }
      })
      .catch(() => {})
  }, [neg.company_id])

  useEffect(() => {
    const loadData = async () => {
      const cat = neg.consumer_category || neg.sizing?.consumer_category || ''
      const details = await fetchTariffDetails(neg.utility_id, cat)
      setTariffDetails(details)
      setTariffFound(details.found !== false)
      const price = await fetchLatestProposalPrice(neg.id)
      setSystemPrice(price || (Number(neg.sizing?.kit_power_kwp) || 0) * 4000)
    }
    loadData()
  }, [neg.id, neg.utility_id])

  const negKey = JSON.stringify(neg.sizing || {})
  useEffect(() => {
    setConsumerCategory(neg.consumer_category || neg.sizing?.consumer_category || '')
    setSimultaneityFactor(
      neg.simultaneity_factor != null
        ? neg.simultaneity_factor
        : neg.sizing?.simultaneity_factor != null
          ? neg.sizing?.simultaneity_factor
          : DEFAULT_SIMULTANEITY_FACTORS[neg.consumer_category || neg.sizing?.consumer_category] ||
            30,
    )
    setPublicLightingFee(neg.public_lighting_fee != null ? neg.public_lighting_fee : 0)
  }, [neg.consumer_category, neg.simultaneity_factor, neg.public_lighting_fee, negKey])

  const handleCategoryChange = (category: string) => {
    setConsumerCategory(category)
    const defaultFactor = defaultFactors[category] || 30
    setSimultaneityFactor(defaultFactor)
    saveFinancialData(category, defaultFactor, publicLightingFee)
    fetchTariffDetails(neg.utility_id, category).then((details) => {
      setTariffDetails(details)
      setTariffFound(details.found !== false)
    })
  }

  const handleFactorChange = (val: number) => {
    setSimultaneityFactor(Math.min(100, Math.max(0, val || 0)))
  }

  const handleFactorBlur = () => {
    saveFinancialData(consumerCategory, simultaneityFactor, publicLightingFee)
  }

  const handleLightingFeeChange = (val: number) => {
    setPublicLightingFee(val || 0)
  }

  const handleLightingFeeBlur = () => {
    saveFinancialData(consumerCategory, simultaneityFactor, publicLightingFee)
  }

  const saveFinancialData = async (category: string, factor: number, lightingFee: number) => {
    try {
      await updateNegotiation(neg.id, {
        consumer_category: category,
        simultaneity_factor: factor,
        public_lighting_fee: lightingFee,
        sizing: { ...neg.sizing, consumer_category: category, simultaneity_factor: factor },
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
    tariffDetails,
    systemPrice,
    publicLightingFee,
  })

  const fioBBaseValue = tariffDetails.fio_b_value || FIO_B_DEFAULT_RATE
  const currentScalingFactor = getFioBScalingFactor()

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <NumericInput
              value={simultaneityFactor}
              onValueChange={handleFactorChange}
              onBlur={handleFactorBlur}
              placeholder="0"
            />
            <p className="text-xs text-muted-foreground">Autoconsumo (% da geração)</p>
          </div>
          <div className="space-y-2">
            <Label>Taxa de Iluminação Pública (R$)</Label>
            <NumericInput
              value={publicLightingFee}
              onValueChange={handleLightingFeeChange}
              onBlur={handleLightingFeeBlur}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">Outras taxas mensais fixas</p>
          </div>
        </div>

        {tariffFound === false && consumerCategory && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Tarifas não configuradas para esta classe ({consumerCategory}). Configure as regras de
              tarifa em Configurações Kit PV.
            </AlertDescription>
          </Alert>
        )}

        <div className="border-2 border-primary/20 rounded-xl p-6 bg-muted/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                <Receipt className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Conta Atual</span>
              </div>
              <p className="text-3xl font-bold">{BRL.format(projection.currentMonthlyCost)}</p>
              <p className="text-xs text-muted-foreground mt-1">por mês</p>
            </div>
            <div className="text-center md:text-left md:border-l md:pl-6 border-primary/10">
              <div className="flex items-center gap-2 mb-2 justify-center md:justify-start">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Conta Após Solar</span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                {BRL.format(projection.futureMonthlyBill)}
              </p>
              <p className="text-xs text-green-700/70 mt-1">estimada por mês</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Economia Mensal</span>
            <span className="text-xl font-bold text-green-600">
              {BRL.format(projection.monthlySavings)}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({BRL.format(projection.annualSavings)}/ano)
              </span>
            </span>
          </div>
        </div>

        <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="font-semibold">Retorno do Investimento (ROI)</span>
              <Badge variant="secondary" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                por proposta
              </Badge>
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

        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <div className="flex items-center justify-between border rounded-lg px-4 py-3 bg-muted/50">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              Detalhamento do Cálculo
            </h4>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                <ChevronDown
                  className={cn(
                    'h-5 w-5 transition-transform duration-200',
                    detailsOpen && 'rotate-180',
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <div className="border border-t-0 rounded-b-lg p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm pb-3 border-b">
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">TE (Tarifa de Energia)</span>
                  <span className="font-medium">
                    {BRL.format(tariffDetails.te)}{' '}
                    <span className="text-xs text-muted-foreground">/kWh</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">TUSD (Uso da Rede)</span>
                  <span className="font-medium">
                    {BRL.format(tariffDetails.tusd)}{' '}
                    <span className="text-xs text-muted-foreground">/kWh</span>
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">Alíquota ICMS</span>
                  <span className="font-medium">
                    {tariffDetails.icms_rate ? `${tariffDetails.icms_rate}%` : '-'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground text-xs">Isenção ICMS</span>
                  <span className="font-medium">
                    {ICMS_LABELS[tariffDetails.icms_exemption] || 'Nenhuma'}
                  </span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Tarifa Base (TE + TUSD)</span>
                  <span className="font-medium">
                    {BRL.format(projection.baseRate)}{' '}
                    <span className="text-xs text-muted-foreground">/kWh</span>
                  </span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Energia da Rede (sem solar)
                  </span>
                  <span className="font-medium">{avgConsumption} kWh</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Custo de Energia (sem solar)</span>
                  <span className="font-medium">
                    {BRL.format(avgConsumption * projection.baseRate)}
                  </span>
                </div>
                {projection.publicLightingFee > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Iluminação Pública
                    </span>
                    <span className="font-medium">{BRL.format(projection.publicLightingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 font-semibold border-t pt-2">
                  <span>Conta Atual Total</span>
                  <span>{BRL.format(projection.currentMonthlyCost)}</span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Consumo Instantâneo (Autoconsumo)</span>
                  <span className="font-medium">
                    {Math.round(projection.instantConsumption)} kWh{' '}
                    <span className="text-xs text-green-600">(sem custo)</span>
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Consumo Compensado</span>
                  <span className="font-medium">
                    {Math.round(projection.compensatedConsumption)} kWh
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Encargo de ICMS TE</span>
                  <span className="font-medium">
                    {BRL.format(projection.teComponent)}{' '}
                    <span className="text-xs text-muted-foreground">/kWh</span>
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Encargo de ICMS TUSD</span>
                  <span className="font-medium">
                    {BRL.format(projection.tusdComponent)}{' '}
                    <span className="text-xs text-muted-foreground">/kWh</span>
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Custo Energia Compensada</span>
                  <span className="font-medium">
                    {BRL.format(projection.compensatedEnergyCost)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Fio B ({BRL.format(fioBBaseValue)}/kWh ×{' '}
                    {Math.round(projection.compensatedConsumption)} kWh ×{' '}
                    {(currentScalingFactor * 100).toFixed(0)}%)
                  </span>
                  <span className="font-medium">{BRL.format(projection.fioBCost)}</span>
                </div>
                {projection.energyFromGrid > 0 && (
                  <>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">
                        Energia da Rede (não compensada)
                      </span>
                      <span className="font-medium">
                        {Math.round(projection.energyFromGrid)} kWh
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Custo Energia da Rede</span>
                      <span className="font-medium">{BRL.format(projection.gridEnergyCost)}</span>
                    </div>
                  </>
                )}
                {projection.publicLightingFee > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Iluminação Pública
                    </span>
                    <span className="font-medium">{BRL.format(projection.publicLightingFee)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1 font-semibold border-t pt-2">
                  <span>Conta Após Solar Total</span>
                  <span>{BRL.format(projection.futureMonthlyBill)}</span>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between py-1 font-semibold text-green-600">
                  <span>Economia Total</span>
                  <span>{BRL.format(projection.monthlySavings)}/mês</span>
                </div>
                <div className="flex justify-between py-1 text-muted-foreground">
                  <span>Economia Anual</span>
                  <span>{BRL.format(projection.annualSavings)}</span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
