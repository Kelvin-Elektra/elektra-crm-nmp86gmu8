import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { FileText, ArrowRight, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { extractSizingMetrics, getBaseValue } from '@/lib/sizing-utils'

export function ProposalWizardModal({ open, onOpenChange, neg, reload, openViewer }: any) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [validity, setValidity] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [description, setDescription] = useState('')
  const [discount, setDiscount] = useState<number>(0)

  const [totalValue, setTotalValue] = useState(0)
  const [pricingDetails, setPricingDetails] = useState<any>(null)
  const [rawPricingData, setRawPricingData] = useState<any>(null)

  const [pricingMode, setPricingMode] = useState<'automatic' | 'manual'>('automatic')
  const [manualKitValue, setManualKitValue] = useState<number>(0)

  useEffect(() => {
    if (open && step === 1) {
      setValidity(new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0])
      setDescription(`Proposta Sistema ${(neg.sizing?.kit_power_kwp || 0).toFixed(2)} kWp`)
      setStep(1)
      loadPricingData()
    }
  }, [open, neg.sizing])

  useEffect(() => {
    if (!rawPricingData) return

    const { autoKitPrice, fixedCosts, varCosts, rateSum, taxSum, marginSum, settings } =
      rawPricingData
    const currentKitPrice = pricingMode === 'manual' ? manualKitValue : autoKitPrice

    const C = currentKitPrice + fixedCosts + varCosts
    const R = rateSum
    const M = marginSum
    const T = taxSum

    let salePrice = 0
    const billingModel = settings.billing_model || 'direct'

    if (1 - R - M - T <= 0) {
      salePrice = (neg.sizing?.kit_power_kwp || 0) * 3500 // fallback
    } else {
      if (billingModel === 'intermediated') {
        salePrice = ((1 - T) * currentKitPrice) / (1 - (R + M) - T)
      } else {
        salePrice = C / (1 - R - M - T)
      }
    }

    setTotalValue(salePrice)
    setPricingDetails({
      ...rawPricingData,
      pricingMode,
      manualKitValue,
      kitPrice: currentKitPrice,
      salePrice,
    })
  }, [rawPricingData, pricingMode, manualKitValue, neg.sizing])

  const loadPricingData = async () => {
    try {
      setLoading(true)
      const companyId = neg.company_id
      const sizing = neg.sizing || {}

      const modRec = sizing.selected_module_id
        ? await pb
            .collection('pv_modules')
            .getOne(sizing.selected_module_id)
            .catch(() => null)
        : null
      const invs = await Promise.all(
        (sizing.inverters || []).map(async (i: any) => {
          const rec = await pb
            .collection('pv_inverters')
            .getOne(i.id)
            .catch(() => null)
          return { ...rec, qty: i.qty }
        }),
      )

      const settings = await pb
        .collection('proposal_settings')
        .getFirstListItem(`company_id='${companyId}'`)
        .catch(() => ({}))
      const allCosts = await pb
        .collection('pv_costs')
        .getFullList({ filter: `company_id='${companyId}'` })
        .catch(() => [])

      const ownerId = neg.owner_id || ''
      const generalCosts = allCosts.filter((c) => !c.user_id || c.user_id === '')
      const specificCosts = allCosts.filter((c) => c.user_id === ownerId)
      const pv_costs = [
        ...specificCosts,
        ...generalCosts.filter((gc) => !specificCosts.some((sc) => sc.name === gc.name)),
      ]

      const { calculateKitPrice } = await import('@/hooks/use-kit-calculator')
      const { kitPrice: autoKitPrice, kitComposition } = await calculateKitPrice(neg)
      const suppliesCost = kitComposition
        .filter((c) => c.type === 'supply')
        .reduce((acc, c) => acc + c.total, 0)

      const modPowerW = modRec?.power || 0
      const metrics = extractSizingMetrics(neg, modPowerW, invs)
      const baseKwp = metrics.totalKwp
      const baseMods = metrics.totalModules
      const baseKw = metrics.totalKw
      const instId = sizing.installation_id || 'none'

      let fixedCosts = 0
      let varCosts = 0
      let rateSum = 0
      let taxSum = 0
      let marginSum = 0

      const appliedCosts: any[] = []

      pv_costs.forEach((c) => {
        let matched = true
        if (
          c.range_type === 'kwp' &&
          (baseKwp < (c.min_val || 0) || (c.max_val && baseKwp > c.max_val))
        )
          matched = false
        if (
          c.range_type === 'modules' &&
          (baseMods < (c.min_val || 0) || (c.max_val && baseMods > c.max_val))
        )
          matched = false
        if (
          c.range_type === 'kw' &&
          (baseKw < (c.min_val || 0) || (c.max_val && baseKw > c.max_val))
        )
          matched = false
        if (c.installation_id && c.installation_id !== instId) matched = false

        if (matched) {
          let amount = 0
          if (c.calc_method === 'fixed') {
            fixedCosts += c.value
            amount = c.value
          }
          if (c.calc_method === 'variable') {
            const effectiveBase = c.calc_base === 'fixed' || !c.calc_base ? 'modules' : c.calc_base
            const baseVal = getBaseValue(effectiveBase, metrics)
            const multiplier = Number(c.multiplier) || 0
            amount = multiplier * baseVal
            varCosts += amount
          }
          if (c.calc_method === 'rate') rateSum += c.value / 100
          if (c.calc_method === 'tax') taxSum += c.value / 100
          if (c.calc_method === 'margin') marginSum += c.value / 100

          const effectiveBase =
            c.calc_method === 'variable' && (c.calc_base === 'fixed' || !c.calc_base)
              ? 'modules'
              : c.calc_base
          appliedCosts.push({
            name: c.name,
            method: c.calc_method,
            value: c.value,
            amount,
            multiplier: c.calc_method === 'variable' ? Number(c.multiplier) || 0 : undefined,
            calcBase: c.calc_method === 'variable' ? effectiveBase : undefined,
            baseValue:
              c.calc_method === 'variable' ? getBaseValue(effectiveBase, metrics) : undefined,
          })
        }
      })

      setRawPricingData({
        autoKitPrice,
        fixedCosts,
        varCosts,
        rateSum,
        taxSum,
        marginSum,
        settings,
        appliedCosts,
        kitComposition,
        equipment: { modules: modRec, inverters: invs },
        supplies: suppliesCost,
        hasSizing: metrics.hasSizing,
      })

      const defMode = settings.default_pricing_mode || 'automatic'
      setPricingMode(defMode)
      if (defMode === 'manual') {
        setManualKitValue(autoKitPrice)
      } else {
        setManualKitValue(autoKitPrice)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => setStep(2)
  const handlePrev = () => setStep(1)

  const handleGenerate = async () => {
    const maxDiscount = (user as any)?.max_discount || 0
    if (discount > maxDiscount) {
      toast({
        variant: 'destructive',
        title: 'Desconto não permitido',
        description: `O desconto máximo permitido para seu usuário é ${maxDiscount}%`,
      })
      return
    }

    setLoading(true)
    try {
      const finalPrice = totalValue * (1 - discount / 100)

      const snapshotData = {
        sizing: neg.sizing || {},
        pricing: pricingDetails,
        template:
          pricingDetails?.settings?.active_template_id ||
          pricingDetails?.settings?.template ||
          'modern',
        branding: pricingDetails?.settings?.branding || {},
        pages_layout: pricingDetails?.settings?.pages_layout || [],
      }

      const cost_breakdown = [
        {
          name: 'Kit Fotovoltaico (Equipamentos e Insumos)',
          cost: pricingDetails.kitPrice,
          margin: 0,
          price: pricingDetails.kitPrice,
        },
        {
          name: 'Custos Operacionais e Serviços',
          cost: pricingDetails.fixedCosts + pricingDetails.varCosts,
          margin: 0,
          price: pricingDetails.fixedCosts + pricingDetails.varCosts,
        },
        {
          name: 'Margens e Taxas Aplicadas',
          cost: 0,
          margin: 0,
          price:
            totalValue -
            pricingDetails.kitPrice -
            pricingDetails.fixedCosts -
            pricingDetails.varCosts,
        },
      ]

      const rec = await pb.collection('proposals').create({
        company_id: neg.company_id,
        negotiation_id: neg.id,
        description:
          description || `Proposta Sistema ${(neg.sizing?.kit_power_kwp || 0).toFixed(2)} kWp`,
        price: finalPrice,
        status: 'draft',
        validity_date: validity ? new Date(validity).toISOString() : null,
        payment_terms: paymentTerms,
        notes: notes,
        discount_amount: discount,
        total_value: finalPrice,
        kit_details: JSON.stringify(snapshotData),
        cost_breakdown: cost_breakdown,
        snapshot_data: snapshotData,
      })

      toast({ title: 'Proposta gerada com sucesso' })
      reload()
      onOpenChange(false)
      openViewer(rec)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Gerador de Proposta - Passo {step} de 2</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Revisão do Dimensionamento Financeiro'
              : 'Ajustes Financeiros e Condições'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
              <h4 className="font-semibold text-sm border-b pb-2 mb-2">
                Dados Técnicos do Dimensionamento
              </h4>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Potência do Kit:</span>
                <span className="font-semibold">
                  {(neg.sizing?.kit_power_kwp || 0).toFixed(2)} kWp
                </span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-muted-foreground">Qtd. Módulos:</span>
                <span className="font-semibold">{neg.sizing?.module_qty || 0}</span>
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-4">
              <h4 className="font-semibold text-sm border-b border-primary/10 pb-2">
                Composição do Custo do Kit
              </h4>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Modo de Precificação:</span>
                <RadioGroup
                  value={pricingMode}
                  onValueChange={(v) => setPricingMode(v as 'automatic' | 'manual')}
                  className="flex gap-4"
                  disabled={user?.role === 'user'}
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem
                      value="automatic"
                      id="mode-auto"
                      disabled={user?.role === 'user'}
                    />
                    <Label
                      htmlFor="mode-auto"
                      className={`cursor-pointer ${user?.role === 'user' ? 'opacity-50' : ''}`}
                    >
                      Automático
                    </Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem
                      value="manual"
                      id="mode-manual"
                      disabled={user?.role === 'user'}
                    />
                    <Label
                      htmlFor="mode-manual"
                      className={`cursor-pointer ${user?.role === 'user' ? 'opacity-50' : ''}`}
                    >
                      Manual
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {pricingMode === 'manual' ? (
                <div className="flex justify-between items-center bg-white p-3 rounded-md border shadow-sm">
                  <span className="text-muted-foreground font-medium">
                    Custo Base do Kit (Manual):
                  </span>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      R$
                    </span>
                    <Input
                      type="number"
                      className="w-36 text-right pl-8 font-medium"
                      value={manualKitValue || ''}
                      onChange={(e) => setManualKitValue(Number(e.target.value))}
                      disabled={user?.role === 'user'}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center bg-white p-3 rounded-md border shadow-sm">
                  <span className="text-muted-foreground font-medium">
                    Custo Formado do Kit (Auto):
                  </span>
                  <span className="font-semibold text-lg">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      rawPricingData?.autoKitPrice || 0,
                    )}
                  </span>
                </div>
              )}
            </div>

            {rawPricingData?.appliedCosts && rawPricingData.appliedCosts.length > 0 && (
              <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
                <h4 className="font-semibold text-sm border-b pb-2">
                  Detalhamento de Custos Aplicados
                </h4>
                {!rawPricingData?.hasSizing && (
                  <p className="text-xs text-destructive font-medium">
                    ⚠ Esta negociação não possui dimensionamento completo. Custos variáveis podem
                    não ser calculados corretamente.
                  </p>
                )}
                {rawPricingData.appliedCosts.map((cost: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex justify-between text-sm py-1 border-b last:border-0"
                  >
                    <span className="text-muted-foreground">
                      {cost.method === 'variable' && cost.multiplier ? (
                        <>
                          {cost.name}:{' '}
                          {cost.multiplier.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          ×{' '}
                          {cost.baseValue?.toLocaleString('pt-BR', {
                            maximumFractionDigits: 2,
                          })}{' '}
                          {cost.calcBase === 'modules'
                            ? 'módulos'
                            : cost.calcBase === 'kwp'
                              ? 'kWp'
                              : cost.calcBase === 'kw'
                                ? 'kW'
                                : ''}
                        </>
                      ) : (
                        cost.name
                      )}
                    </span>
                    <span className="font-medium">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(cost.amount || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-muted/30 p-4 rounded-lg border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">
                  Preço de Venda Base Calculado:
                </span>
                <span className="font-bold text-primary text-xl">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    totalValue || 0,
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 italic">
                A formação de preços utiliza os insumos, regras de custo, impostos e margens
                configurados no painel de administração.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNext} disabled={loading}>
                Avançar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Descrição da Proposta</Label>
              <Input
                placeholder="Ex: Sistema 10 kWp - Telhado Cerâmico"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Validade da Proposta</Label>
                <Input type="date" value={validity} onChange={(e) => setValidity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Desconto Aplicado (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max={(user as any)?.max_discount || 0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Máx. permitido: {(user as any)?.max_discount || 0}%
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condições de Pagamento</Label>
              <Input
                placeholder="Ex: Entrada de 30% + 12x sem juros"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações Internas (Não sai no PDF)</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex justify-between items-center mt-4">
              <span className="font-medium text-lg">Valor Final:</span>
              <span className="font-bold text-xl text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  totalValue * (1 - discount / 100),
                )}
              </span>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handlePrev}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                <FileText className="w-4 h-4 mr-2" /> Gerar Proposta
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
