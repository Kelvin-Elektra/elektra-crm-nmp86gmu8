import { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { createProposalHistory } from '@/services/proposal-history'
import { createGeneratorProposal, getTemplatesResponse } from '@/services/templates'
import { enrichPayloadWithSemanticVariables } from '@/lib/semantic-mapper'
import {
  calculateConsumptionCoverage,
  calculateOccupiedArea,
  calculateCo2Avoided,
  calculateInvestmentMultiple,
  calculateTir,
  calculateDetailed25YearsProjection,
  generateSavingsProjection,
  extractValidityDays,
  formatProposalDate,
  extractEstimatedMonthlyGeneration,
  buildEquipmentsArray,
  buildCommercialConditionsArray,
} from '@/lib/solar-calculations'
import { recalcPricingWithDiscount } from '@/lib/discount-recalc'
import { Plus, Trash2, Info, AlertTriangle } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { NumericInput } from '@/components/ui/numeric-input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  CompanyLeadTimeItem,
  normalizeCompanyLeadTimes,
  getDefaultLeadTime,
  composeLeadTimeText,
} from '@/types/lead-time'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function pct2(v: number): string {
  return (Number(v) || 0).toFixed(2)
}

function brl2(v: number): string {
  return BRL.format(Number(v) || 0)
}

function parsePaymentMethods(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((m: any) => typeof m === 'string' && m.trim() !== '')
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export function ProposalEditModal({ open, onOpenChange, proposal, reload }: any) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [newMethod, setNewMethod] = useState('')

  const isAdmin =
    user?.role === 'User_elektra' || user?.role_company === 'admin' || user?.role === 'User_owner'

  const snapshot = useMemo(() => {
    try {
      return typeof proposal?.snapshot_data === 'string'
        ? JSON.parse(proposal.snapshot_data)
        : proposal?.snapshot_data || {}
    } catch {
      return {}
    }
  }, [proposal])

  const marginSum = snapshot?.pricing?.marginSum || 0
  const storedDiscount = Number(proposal?.discount_amount) || 0
  const storedTotal = Number(proposal?.total_value || proposal?.price) || 0
  const subtotal = storedDiscount > 0 ? storedTotal / (1 - storedDiscount / 100) : storedTotal

  const [discountMode, setDiscountMode] = useState<'percent' | 'final_price'>('percent')
  const [discountPercent, setDiscountPercent] = useState(storedDiscount)
  const [finalPriceInput, setFinalPriceInput] = useState(storedTotal)
  const [paymentTerms, setPaymentTerms] = useState(proposal?.payment_terms || '')
  const [hasFinancing, setHasFinancing] = useState<boolean>(
    Boolean(
      proposal?.has_financing ?? snapshot?.has_financing ?? snapshot?.contempla_financiamento,
    ),
  )
  const [notes, setNotes] = useState(proposal?.notes || '')
  const [validityDate, setValidityDate] = useState(
    proposal?.validity_date ? new Date(proposal.validity_date).toISOString().split('T')[0] : '',
  )
  const [installationLeadTime, setInstallationLeadTime] = useState(
    snapshot?.installation_lead_time || '',
  )
  const [companyLeadTimes, setCompanyLeadTimes] = useState<CompanyLeadTimeItem[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>(
    parsePaymentMethods(snapshot?.accepted_payment_methods),
  )
  const [definedPaymentMethod, setDefinedPaymentMethod] = useState(
    snapshot?.defined_payment_method || '',
  )

  useEffect(() => {
    if (!open) return
    setDiscountPercent(storedDiscount)
    setFinalPriceInput(storedTotal)
    setDiscountMode('percent')
  }, [open, storedDiscount, storedTotal])

  useEffect(() => {
    if (!open) return
    const companyId = user?.company_id || proposal?.company_id
    if (!companyId) return
    pb.collection('companies')
      .getOne(companyId)
      .then(async (comp) => {
        if (comp) {
          const list = normalizeCompanyLeadTimes(
            comp.installation_lead_times,
            comp.installation_lead_time,
          )
          setCompanyLeadTimes(list)
          // Se não havia prazo na proposta/snapshot, pré-seleciona o prazo padrão:
          // 1. proposal_settings (dias + texto) 2. item padrão dos prazos da empresa
          if (!snapshot?.installation_lead_time && !installationLeadTime) {
            const settingsRec = await pb
              .collection('proposal_settings')
              .getFirstListItem(`company_id = '${companyId}'`)
              .catch(() => null)
            const settingsLeadTime = settingsRec
              ? composeLeadTimeText(
                  (settingsRec as any).default_lead_time_days,
                  (settingsRec as any).default_lead_time_text,
                )
              : ''
            if (settingsLeadTime) setInstallationLeadTime(settingsLeadTime)
            else {
              const def = getDefaultLeadTime(list)
              if (def) setInstallationLeadTime(def)
            }
          }
        }
      })
      .catch(() => {
        /* ignore */
      })
  }, [open, user?.company_id, proposal?.company_id])

  const handlePercentChange = (val: number) => {
    setDiscountPercent(val)
    if (subtotal > 0) {
      const derived = subtotal * (1 - val / 100)
      setFinalPriceInput(Number(derived.toFixed(2)))
    }
  }

  const handleFinalPriceChange = (val: number) => {
    setFinalPriceInput(val)
    if (subtotal > 0) {
      const diff = subtotal - val
      const derivedPct = (diff / subtotal) * 100
      setDiscountPercent(Number(derivedPct.toFixed(2)))
    }
  }

  const recalc = useMemo(() => {
    if (subtotal <= 0) return null
    if (discountMode === 'final_price') {
      return recalcPricingWithDiscount({
        subtotal,
        targetSalePrice: finalPriceInput,
        pricing: snapshot?.pricing,
        billingModel: snapshot?.settings?.billing_model,
      })
    }
    return recalcPricingWithDiscount({
      subtotal,
      discountPercent,
      pricing: snapshot?.pricing,
      billingModel: snapshot?.settings?.billing_model,
    })
  }, [subtotal, discountMode, finalPriceInput, discountPercent, snapshot])

  const originalRecalc = useMemo(
    () =>
      recalcPricingWithDiscount({
        subtotal,
        discountPercent: 0,
        pricing: snapshot?.pricing,
        billingModel: snapshot?.settings?.billing_model,
      }),
    [subtotal, snapshot],
  )

  const effectiveDiscountPercent = recalc ? recalc.discountPercent : discountPercent
  const effectiveDiscountValue = recalc ? recalc.discountValue : (subtotal * discountPercent) / 100
  const effectiveFinalTotal = recalc ? recalc.finalTotal : subtotal - effectiveDiscountValue

  const originalMarginAmount = originalRecalc ? originalRecalc.marginAmount : subtotal * marginSum
  const adjustedMarginAmount = recalc
    ? recalc.marginAmount
    : originalMarginAmount - effectiveDiscountValue
  const adjustedMarginPct = recalc
    ? recalc.marginPct * 100
    : marginSum * 100 - effectiveDiscountPercent
  const marginSumPct = originalRecalc ? originalRecalc.marginPct * 100 : marginSum * 100
  const maxDiscount = Number((user as any)?.max_discount) || 0
  const discountExceeded = effectiveDiscountPercent > maxDiscount + 0.01 && !isAdmin

  const addPaymentMethod = () => {
    const val = newMethod.trim()
    if (!val) return
    setPaymentMethods([...paymentMethods, val])
    setNewMethod('')
  }

  const removePaymentMethod = (idx: number) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i !== idx))
  }

  const handleSave = async () => {
    if (discountExceeded) return
    setLoading(true)
    const saveFinalTotal = effectiveFinalTotal
    const saveDiscountPct =
      effectiveDiscountPercent > 0 ? Number(effectiveDiscountPercent.toFixed(2)) : 0
    try {
      const updatedSnapshot = {
        ...snapshot,
        has_financing: hasFinancing,
        contempla_financiamento: hasFinancing,
        installation_lead_time: installationLeadTime,
        accepted_payment_methods: paymentMethods.filter((m) => m.trim() !== ''),
        defined_payment_method: definedPaymentMethod,
      }
      // Se a proposta foi gerada no Gerador (possui template_id e snapshot configurado),
      // reenvia com o mesmo external_id para atualizar a proposta mantendo o mesmo link
      const templateId =
        updatedSnapshot.generator_template_id ||
        updatedSnapshot.template ||
        proposal.template_id ||
        null

      let updatedViewUrl = proposal.view_url || updatedSnapshot.view_url || null
      let generatorSyncFailed = false

      if (templateId) {
        try {
          // Mapeamento e aliases de variáveis dinâmicas retrocompatíveis:
          // - lead: document -> cpf_cnpj; phone -> whatsapp
          // - sizing: kit_power_kwp -> power_kwp, kwp; avg_consumption -> average_consumption, monthly_consumption, consumption_kwh;
          //           estimated_monthly_generation -> monthly_generation, generation_kwh; module_qty -> module_quantity, modules_count
          // - financial: total_investment -> investment, price, total_value; monthly_savings -> economy_monthly, estimated_monthly_savings;
          //              payback_years & payback_months -> payback (numérico em anos); annual_savings -> yearly_savings; savings_25_years -> total_savings_25y
          const leadDoc = updatedSnapshot.lead_document || updatedSnapshot.document || ''
          const leadPh = updatedSnapshot.lead_phone || updatedSnapshot.phone || ''
          const leadCity =
            updatedSnapshot.sizing?.address_struct?.city ||
            updatedSnapshot.sizing?.city ||
            updatedSnapshot.city ||
            ''
          const leadState =
            updatedSnapshot.sizing?.address_struct?.state ||
            updatedSnapshot.sizing?.state ||
            updatedSnapshot.state ||
            ''

          const leadData = {
            name: updatedSnapshot.lead_name || 'Cliente',
            email: updatedSnapshot.lead_email || updatedSnapshot.email || '',
            phone: leadPh,
            whatsapp: leadPh,
            document: leadDoc,
            cpf_cnpj: leadDoc,
            address: updatedSnapshot.address || '',
            city: leadCity,
            state: leadState,
          }

          const consultantName =
            (proposal as any)?.consultant_name ||
            (proposal as any)?.expand?.negotiation_id?.expand?.owner_id?.name ||
            (proposal as any)?.expand?.owner_id?.name ||
            user?.name ||
            'Consultor Elektra'
          const proposalNumber = proposal.id || ''
          const proposalDate = formatProposalDate(proposal.created)
          const validityDays = extractValidityDays(validityDate, proposal.created, 10)

          const commercialConditions = buildCommercialConditionsArray({
            paymentTerms,
            definedPaymentMethod,
            acceptedPaymentMethods: paymentMethods.join(', '),
            validityDays,
            installationLeadTime,
            moduleWarranty: updatedSnapshot.pricing_data?.rawModule?.warranty,
            inverterWarranty: updatedSnapshot.pricing_data?.rawInverters?.[0]?.warranty,
          })

          const negotiationPayload = {
            id: proposal.negotiation_id,
            validity_date: validityDate || '',
            validity: validityDate || '',
            validity_days: validityDays,
            consultant_name: consultantName,
            proposal_number: proposalNumber,
            proposal_date: proposalDate,
            payment_terms: paymentTerms || '',
            defined_payment_method: definedPaymentMethod || '',
            accepted_payment_methods: paymentMethods.join(', '),
            installation_lead_time: installationLeadTime || '',
            notes: notes || '',
            commercial_conditions: commercialConditions,
          }

          const rawSizing = updatedSnapshot.sizing || {}
          const kitPower = Number(rawSizing.kit_power_kwp) || 0
          const avgCons =
            Number(rawSizing.avg_consumption) || Number(updatedSnapshot.avg_consumption) || 0
          const estGen = extractEstimatedMonthlyGeneration(rawSizing, kitPower)
          const modQty = Number(rawSizing.module_qty) || 0
          const consumptionCoveragePct = calculateConsumptionCoverage(estGen, avgCons)
          const occupiedAreaM2 = calculateOccupiedArea(modQty, rawSizing.module_dimensions || null)

          const fp = updatedSnapshot.financialProjection
          const resolvedConcessionaire =
            rawSizing.concessionaire ||
            fp?.tariffDetails?.utility_name ||
            fp?.tariffDetails?.name ||
            ''
          const resolvedRoofType = rawSizing.roof_type || rawSizing.structure_type || ''
          const resolvedTension =
            rawSizing.tension || rawSizing.voltage || fp?.tariffDetails?.voltage || ''

          const editTplId =
            updatedSnapshot.generator_template_id ||
            updatedSnapshot.template ||
            proposal.template_id ||
            null
          const includeSuppliesFlag =
            !editTplId || updatedSnapshot.templates_config?.[editTplId]?.include_supplies !== false
          const equipmentsList = buildEquipmentsArray({
            module: updatedSnapshot.pricing_data?.rawModule,
            moduleQty: modQty,
            inverters: updatedSnapshot.pricing_data?.rawInverters || rawSizing.inverters,
            supplies:
              updatedSnapshot.pricing_data?.kitComposition ||
              updatedSnapshot.pricing_data?.supplies,
            includeSupplies: includeSuppliesFlag,
          })

          const sizingPayload = {
            ...rawSizing,
            kit_power_kwp: kitPower,
            power_kwp: kitPower,
            kwp: kitPower,
            avg_consumption: avgCons,
            average_consumption: avgCons,
            average_monthly_consumption_kwh: avgCons,
            monthly_consumption: avgCons,
            consumption_kwh: avgCons,
            estimated_monthly_generation: estGen,
            monthly_generation: estGen,
            generation_kwh: estGen,
            estimated_generation_kwh: estGen,
            consumption_coverage_pct: consumptionCoveragePct,
            occupied_area_m2: occupiedAreaM2,
            module_qty: modQty,
            module_quantity: modQty,
            modules_count: modQty,
            concessionaire: resolvedConcessionaire,
            roof_type: resolvedRoofType,
            tension: resolvedTension,
            city: leadCity,
            state: leadState,
            equipments: equipmentsList,
            commercial_conditions: commercialConditions,
          }
          if (resolvedConcessionaire) sizingPayload.concessionaire = resolvedConcessionaire
          if (resolvedRoofType) sizingPayload.roof_type = resolvedRoofType
          if (resolvedTension) sizingPayload.tension = resolvedTension
          sizingPayload.equipments = equipmentsList
          const paybackYearsVal =
            fp?.roiYears != null
              ? Number((fp.roiYears + (fp.roiRemainingMonths || 0) / 12).toFixed(1))
              : Number(fp?.paybackYears) || 0
          const monthlySav = Number(fp?.monthlySavings) || 0
          const annualSavingsVal = Number(fp?.annualSavings) || monthlySav * 12
          const co2AvoidedTon = calculateCo2Avoided(estGen)

          // Projeção Detalhada 25 anos com degradação e reajuste anual de tarifas
          // Preservar valores já congelados no snapshot se existirem; se não existirem, prioridade: negociação > concessionária > 0
          const prevCalcSnap = proposal.calc_snapshot || updatedSnapshot.calc_snapshot || {}
          const annualTariffAdjustment =
            prevCalcSnap.annual_tariff_adjustment != null
              ? Number(prevCalcSnap.annual_tariff_adjustment)
              : fp?.tariffDetails?.annual_tariff_adjustment != null
                ? Number(fp.tariffDetails.annual_tariff_adjustment)
                : fp?.annual_tariff_adjustment != null
                  ? Number(fp.annual_tariff_adjustment)
                  : Number(rawSizing.annual_tariff_adjustment) || 0
          const annualDegradation =
            prevCalcSnap.annual_degradation != null
              ? Number(prevCalcSnap.annual_degradation)
              : fp?.annual_degradation != null
                ? Number(fp.annual_degradation)
                : Number(updatedSnapshot.pricing_data?.rawModule?.annual_degradation) || 0.5

          const detailedProjectionTable = calculateDetailed25YearsProjection({
            annualConsumptionKwh: avgCons * 12,
            annualGenerationYear1Kwh: estGen * 12,
            annualDegradationPct: annualDegradation,
            annualTariffAdjustmentPct: annualTariffAdjustment,
            simultaneityFactor: Number(rawSizing.simultaneity_factor) || 30,
            tariffDetails: fp?.tariffDetails || {
              te: 0,
              tusd: 0,
              icms_rate: 0,
              icms_exemption: 'none',
              fio_b_value: 0.22,
            },
            publicLightingFeeMonthly: Number(fp?.publicLightingFee) || 0,
            totalInvestment: saveFinalTotal,
            years: 25,
          })

          const savings25YearsVal =
            detailedProjectionTable.length > 0
              ? detailedProjectionTable[detailedProjectionTable.length - 1].cumulativeSavings
              : Number(fp?.savings25Years) || annualSavingsVal * 25
          const investmentMultiple = calculateInvestmentMultiple(savings25YearsVal, saveFinalTotal)
          const tirPct = calculateTir(saveFinalTotal, annualSavingsVal, 25)
          const savingsProjection = generateSavingsProjection(detailedProjectionTable)

          const calcSnapshot = {
            ...prevCalcSnap,
            frozen_at: prevCalcSnap.frozen_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            annual_degradation: annualDegradation,
            annual_tariff_adjustment: annualTariffAdjustment,
            simultaneity_factor: Number(rawSizing.simultaneity_factor) || 30,
            tariff_details: fp?.tariffDetails || prevCalcSnap.tariff_details || {},
            total_investment: saveFinalTotal,
            savings_projection_table: detailedProjectionTable,
            savings_25_years: savings25YearsVal,
            payback_years: paybackYearsVal,
            tir_pct: tirPct,
            investment_multiple: investmentMultiple,
          }

          const financialPayload = {
            total_investment: saveFinalTotal,
            investment: saveFinalTotal,
            price: saveFinalTotal,
            total_value: saveFinalTotal,
            sale_price: saveFinalTotal,
            subtotal: subtotal,
            discount_amount: saveDiscountPct,
            has_financing: hasFinancing,
            contempla_financiamento: hasFinancing,
            monthly_savings: monthlySav,
            economy_monthly: monthlySav,
            estimated_monthly_savings: monthlySav,
            payback_years: paybackYearsVal,
            payback_months: Number(fp?.roiMonths) || 0,
            payback: paybackYearsVal,
            annual_savings: annualSavingsVal,
            yearly_savings: annualSavingsVal,
            savings_25_years: savings25YearsVal,
            total_savings_25y: savings25YearsVal,
            annual_tariff_adjustment: annualTariffAdjustment,
            annual_degradation: annualDegradation,
            investment_multiple: investmentMultiple,
            tir_pct: tirPct,
            co2_avoided_ton: co2AvoidedTon,
            tariff_details: fp?.tariffDetails || {},
            savings_projection: savingsProjection,
            savings_projection_table: detailedProjectionTable,
            calc_snapshot: calcSnapshot,
          }

          updatedSnapshot.calc_snapshot = calcSnapshot
          // Persiste o recálculo REAL de custos/margem com o desconto aplicado
          // (custos-base originais preservados em appliedCosts[].value)
          if (recalc && updatedSnapshot.pricing) {
            updatedSnapshot.pricing = {
              ...updatedSnapshot.pricing,
              appliedCosts: recalc.appliedCosts as any,
              salePriceWithDiscount: recalc.finalTotal,
              discount: {
                percent: recalc.discountPercent,
                value: recalc.discountValue,
                base: recalc.baseTotal,
              },
              marginFinal: recalc.marginAmount,
              marginFinalPct: recalc.marginPct,
            }
          }
          // Obter schemas dinâmicos se possível para filtrar o fixed_data e enriquecer semanticamente
          let templateFields: any[] | undefined = undefined
          let dynamicSchema: any = undefined
          try {
            const templatesRes = await getTemplatesResponse()
            const found = templatesRes.templates.find((t) => t.id === templateId)
            if (found?.variable_schema?.fixed) {
              templateFields = found.variable_schema.fixed
            }
            if (found?.variable_schema?.dynamic) {
              dynamicSchema = found.variable_schema.dynamic
            }
          } catch {
            /* intentionally ignored */
          }

          const enriched = enrichPayloadWithSemanticVariables(dynamicSchema, {
            lead: leadData,
            negotiation: negotiationPayload,
            sizing: sizingPayload,
            financial: financialPayload,
          })

          const genRes = await createGeneratorProposal(
            {
              template_id: templateId,
              external_id: proposal.id,
              fixed_data: updatedSnapshot.fixed_data || updatedSnapshot.branding || {},
              lead: enriched.lead,
              negotiation: enriched.negotiation,
              sizing: enriched.sizing,
              financial: enriched.financial,
              dynamic: enriched.dynamic,
              manual_mappings: updatedSnapshot.manual_mappings || undefined,
            },
            templateFields,
          )
          if (genRes?.view_url) {
            updatedViewUrl = genRes.view_url
            updatedSnapshot.view_url = genRes.view_url
          }
        } catch (genErr) {
          console.warn('Aviso: Não foi possível atualizar no gerador remoto:', genErr)
          generatorSyncFailed = true
        }
      }

      await pb.collection('proposals').update(proposal.id, {
        discount_amount: saveDiscountPct,
        total_value: saveFinalTotal,
        price: subtotal,
        payment_terms: paymentTerms,
        has_financing: hasFinancing,
        notes: notes,
        validity_date: validityDate ? new Date(validityDate).toISOString() : null,
        snapshot_data: updatedSnapshot,
        calc_snapshot: updatedSnapshot.calc_snapshot || null,
        external_id: proposal.id,
        ...(updatedViewUrl ? { view_url: updatedViewUrl } : {}),
      })
      await createProposalHistory(proposal.id, updatedSnapshot)
      if (generatorSyncFailed) {
        toast({
          variant: 'destructive',
          title: 'Proposta atualizada no CRM, mas não no Gerador',
          description:
            'O documento gerado ainda mostra os valores antigos. Edite e salve novamente para sincronizar.',
        })
      } else {
        toast({ title: 'Proposta atualizada' })
      }
      reload()
      onOpenChange(false)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Proposta</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              Edite os termos financeiros e validade da proposta.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Ajuste de Preço: Desconto % vs Valor Final R$ */}
          <div className="border rounded-lg p-3.5 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="font-semibold text-sm">Ajuste de Preço</Label>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Escolha entre aplicar % de desconto ou setar o valor final em reais
                      diretamente. A margem absorve o ajuste e os custos percentuais são
                      recalculados.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center gap-1 bg-muted p-1 rounded text-xs">
                <button
                  type="button"
                  onClick={() => setDiscountMode('percent')}
                  className={cn(
                    'px-2.5 py-1 rounded transition-colors font-medium',
                    discountMode === 'percent'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Por Desconto (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountMode('final_price')}
                  className={cn(
                    'px-2.5 py-1 rounded transition-colors font-medium',
                    discountMode === 'final_price'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Por Valor Final (R$)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-1">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-xs font-medium">Desconto (%)</Label>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    Máx: {pct2(maxDiscount)}%
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={isAdmin ? 100 : maxDiscount}
                  value={discountPercent || ''}
                  disabled={discountMode !== 'percent'}
                  onChange={(e) => handlePercentChange(Number(e.target.value))}
                  className={cn(
                    'text-sm h-9',
                    discountMode !== 'percent' && 'bg-muted/50 cursor-not-allowed',
                  )}
                  placeholder="0,00"
                />
                <div className="h-4">
                  {discountMode === 'final_price' && (
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Derivado: {pct2(effectiveDiscountPercent)}%
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between h-5">
                  <Label className="text-xs font-medium">Valor Final de Venda (R$)</Label>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    Base: {brl2(subtotal)}
                  </span>
                </div>
                <NumericInput
                  value={effectiveFinalTotal}
                  precision={2}
                  disabled={discountMode !== 'final_price'}
                  onChangeValue={(val) => handleFinalPriceChange(val || 0)}
                  className={cn(
                    'text-sm font-semibold h-9',
                    discountMode !== 'final_price' && 'bg-muted/50 cursor-not-allowed',
                  )}
                />
                <div className="h-4">
                  {effectiveDiscountValue > 0 && (
                    <p className="text-[11px] text-destructive tabular-nums">
                      Diferença: - {brl2(effectiveDiscountValue)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {discountExceeded && (
              <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Desconto de {pct2(effectiveDiscountPercent)}% excede o limite máximo permitido
                  para seu usuário ({pct2(maxDiscount)}%).
                </span>
              </div>
            )}
          </div>

          {isAdmin && marginSum > 0 && effectiveDiscountPercent > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm text-amber-900">Impacto na Margem Real</h4>
              <div className="flex justify-between text-sm">
                <span className="text-amber-700">Margem Original:</span>
                <span className="font-medium text-amber-900">
                  {brl2(originalMarginAmount)} ({pct2(marginSumPct)}%)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-700">
                  {recalc ? 'Custos (recalc. s/ venda c/ desconto):' : 'Desconto Aplicado:'}
                </span>
                <span className="font-medium text-destructive">
                  - {brl2(recalc ? recalc.costsTotal : effectiveDiscountValue)}
                </span>
              </div>
              {recalc && (
                <div className="flex justify-between text-xs text-amber-700/80">
                  <span>Venda com desconto:</span>
                  <span>{brl2(recalc.finalTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold pt-1 border-t border-amber-200">
                <span className="text-amber-900">Margem Ajustada:</span>
                <span className="font-medium text-amber-700">
                  {brl2(adjustedMarginAmount)} ({pct2(adjustedMarginPct)}%)
                </span>
              </div>
            </div>
          )}

          <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{brl2(subtotal)}</span>
            </div>
            {effectiveDiscountValue > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Desconto ({pct2(effectiveDiscountPercent)}%):
                </span>
                <span className="font-medium text-destructive">
                  - {brl2(effectiveDiscountValue)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t">
              <span>Total da Proposta:</span>
              <span className="text-primary">{brl2(effectiveFinalTotal)}</span>
            </div>
          </div>
          {/* Toggle de Financiamento */}
          <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/40">
            <div className="space-y-0.5">
              <Label
                htmlFor="toggle-edit-financing"
                className="text-sm font-semibold cursor-pointer"
              >
                Proposta contempla financiamento?
              </Label>
              <p className="text-xs text-muted-foreground">
                Indica se há opção de financiamento bancário para esta proposta.
              </p>
            </div>
            <Switch
              id="toggle-edit-financing"
              checked={hasFinancing}
              onCheckedChange={setHasFinancing}
            />
          </div>

          <div className="space-y-2">
            <Label>Data de Validade</Label>
            <Input
              type="date"
              value={validityDate}
              onChange={(e) => setValidityDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Condições de Pagamento</Label>
            <Textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Forma de Pagamento Definida</Label>
            <Input
              placeholder="Ex: PIX, Boleto, Cartão de Crédito"
              value={definedPaymentMethod}
              onChange={(e) => setDefinedPaymentMethod(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Prazo de Instalação</Label>
            {companyLeadTimes.length > 0 ? (
              <div className="space-y-1.5">
                <Select
                  value={
                    companyLeadTimes.some((lt) => lt.label === installationLeadTime)
                      ? installationLeadTime
                      : '__custom__'
                  }
                  onValueChange={(val) => {
                    if (val !== '__custom__') {
                      setInstallationLeadTime(val)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o prazo de instalação" />
                  </SelectTrigger>
                  <SelectContent>
                    {companyLeadTimes.map((item) => (
                      <SelectItem key={item.id} value={item.label}>
                        {item.label} {item.is_default ? '(padrão)' : ''}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">Outro prazo personalizado...</SelectItem>
                  </SelectContent>
                </Select>

                {(!companyLeadTimes.some((lt) => lt.label === installationLeadTime) ||
                  installationLeadTime === '') && (
                  <Input
                    placeholder="Digite o prazo personalizado"
                    value={installationLeadTime}
                    onChange={(e) => setInstallationLeadTime(e.target.value)}
                    className="text-sm mt-1.5"
                  />
                )}
              </div>
            ) : (
              <Input
                placeholder="Ex: 30 dias"
                value={installationLeadTime}
                onChange={(e) => setInstallationLeadTime(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Formas de Pagamento Aceitas</Label>
            <div className="space-y-2">
              {paymentMethods.map((method, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={method}
                    onChange={(e) => {
                      const newList = [...paymentMethods]
                      newList[idx] = e.target.value
                      setPaymentMethods(newList)
                    }}
                    placeholder="Ex: PIX com 5% desconto"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => removePaymentMethod(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addPaymentMethod()
                    }
                  }}
                  placeholder="Adicionar forma de pagamento..."
                />
                <Button variant="outline" size="icon" type="button" onClick={addPaymentMethod}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || discountExceeded}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
