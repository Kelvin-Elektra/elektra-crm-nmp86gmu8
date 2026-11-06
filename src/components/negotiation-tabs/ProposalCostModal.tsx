import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NumericInput } from '@/components/ui/numeric-input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { saveAndRegenerateProposal } from '@/services/proposal-regenerator'
import { cn } from '@/lib/utils'
import { recalcPricingWithDiscount, isPercentOfSaleMethod } from '@/lib/discount-recalc'
import {
  ChevronDown,
  ChevronRight,
  Package,
  RotateCcw,
  AlertTriangle,
  Receipt,
  Layers,
  Pencil,
  Loader2,
} from 'lucide-react'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

interface CostItem {
  id: string
  name: string
  method: string
  percentage: string
  rawValue?: number
  value: number
  originalValue: number
  taxWeight?: number
  isOverridden?: boolean
  multiplier?: number
  calcBase?: string
  baseValue?: number
}

export function pct2(v: number): string {
  return (Number(v) || 0).toFixed(2)
}

export function brl2(v: number): string {
  return BRL.format(Number(v) || 0)
}

export function isMarginOrCommission(
  name: string = '',
  method: string = '',
): 'margin' | 'commission' | null {
  const norm = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (method === 'margin' || norm.includes('margem') || norm.includes('lucro')) {
    return 'margin'
  }
  if (method === 'commission' || norm.includes('comissao') || norm.includes('comiss')) {
    return 'commission'
  }
  return null
}

interface KitItem {
  name: string
  qty: number
  total: number
  type: string
  ruleApplied?: boolean
}

export function ProposalCostModal({ open, onOpenChange, proposal, reload }: any) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  // Subgrupos de custos
  const [negotiationCosts, setNegotiationCosts] = useState<CostItem[]>([])
  const [kitTotalCost, setKitTotalCost] = useState<number>(0)
  const [kitItems, setKitItems] = useState<KitItem[]>([])
  const [originalKitItems, setOriginalKitItems] = useState<KitItem[]>([])
  const [originalKitPrice, setOriginalKitPrice] = useState<number>(0)
  const [snapshot, setSnapshot] = useState<any>(null)

  // Controle de blocos recolhíveis:
  // Bloco principal "Composição de Custos" inicia RECOLHIDO por padrão (preferência do usuário)
  const [expandedComposition, setExpandedComposition] = useState(false)
  const [expandedKit, setExpandedKit] = useState(true)
  const [expandedNegotiationCosts, setExpandedNegotiationCosts] = useState(true)
  const [expandedPostDiscount, setExpandedPostDiscount] = useState(true)

  // Sobrescritas manuais em R$ por nome de custo
  const [manualCostOverrides, setManualCostOverrides] = useState<Record<string, number>>({})
  const [denominatorError, setDenominatorError] = useState<string | null>(null)

  // Modo duplo de entrada de desconto: 'percent' ou 'final_price'
  const [inputMode, setInputMode] = useState<'percent' | 'final_price'>('percent')
  const [discountPercentInput, setDiscountPercentInput] = useState<number>(0)
  const [finalPriceInput, setFinalPriceInput] = useState<number>(0)

  const isAdmin =
    user?.role === 'User_elektra' || user?.role_company === 'admin' || user?.role === 'User_owner'

  const maxDiscount = Number((user as any)?.max_discount) || 0

  // Inicializa o estado a partir da proposta e do snapshot
  useEffect(() => {
    if (open && proposal) {
      let snap: any = {}
      try {
        snap =
          typeof proposal.snapshot_data === 'string'
            ? JSON.parse(proposal.snapshot_data)
            : proposal.snapshot_data || {}
      } catch {
        snap = {}
      }
      setSnapshot(snap)

      const pricing = snap.pricing || {}
      const appliedCosts = Array.isArray(pricing.appliedCosts) ? pricing.appliedCosts : []
      const kitPrice = Number(pricing.kitPrice) || 0
      const salePrice =
        Number(pricing.salePrice) || Number(proposal.price) || Number(proposal.total_value) || 0
      const kitComposition = Array.isArray(pricing.kitComposition) ? pricing.kitComposition : []

      // Monta Kit
      setKitTotalCost(kitPrice)
      setKitItems(kitComposition.map((item: any) => ({ ...item })))
      setOriginalKitItems(kitComposition.map((item: any) => ({ ...item })))
      setOriginalKitPrice(kitPrice)

      // Monta Custos Negociação sem duplicação (deduplica por nome)
      const seenNames = new Set<string>()
      const negItems: CostItem[] = []

      if (appliedCosts.length > 0) {
        appliedCosts.forEach((c: any, idx: number) => {
          if (!c) return
          if (c.method === 'kit') return // O Kit fica em seu próprio subgrupo
          const name = c.name || `Custo #${idx + 1}`
          if (seenNames.has(name)) return // Garante unicidade
          seenNames.add(name)

          const isPercent =
            isPercentOfSaleMethod(c.method) || c.method === 'margin' || c.method === 'kit_percent'
          const weightLabel =
            c.method === 'tax' && c.taxWeight != null ? ` • Peso: ${pct2(c.taxWeight)}%` : ''

          let displayValue = Number(c.calculatedAmount ?? c.amount ?? 0)
          if (c.method === 'tax' && (!displayValue || displayValue === 0)) {
            const rate = (Number(c.value) || 0) / 100
            const weight = (Number(c.taxWeight) || 100) / 100
            const billingModel =
              pricing.settings?.billing_model || snap.settings?.billing_model || 'direct'
            const totalBase =
              billingModel === 'intermediated' ? Math.max(0, salePrice - kitPrice) : salePrice
            displayValue = totalBase * rate * weight
          }

          negItems.push({
            id: `cost-${idx}-${name}`,
            name,
            method: c.method,
            percentage: isPercent ? `${pct2(c.value)}%${weightLabel}` : '—',
            rawValue: Number(c.value) || 0,
            value: displayValue,
            originalValue: displayValue,
            taxWeight: c.taxWeight != null ? Number(c.taxWeight) : undefined,
            multiplier: c.multiplier != null ? Number(c.multiplier) : undefined,
            calcBase: c.calcBase,
            baseValue: c.baseValue != null ? Number(c.baseValue) : undefined,
          })
        })
      } else {
        let breakdown = proposal.cost_breakdown || []
        if (typeof breakdown === 'string') {
          try {
            breakdown = JSON.parse(breakdown)
          } catch {
            breakdown = []
          }
        }
        if (Array.isArray(breakdown)) {
          breakdown.forEach((c: any, idx: number) => {
            if (!c) return
            const name = c.name || `Custo #${idx + 1}`
            // Se for o kit fotovoltaico salvo no breakdown antigo, não duplicar em custos de negociação
            if (name.toLowerCase().includes('kit fotovoltaico')) {
              if (kitPrice === 0) setKitTotalCost(Number(c.price || c.cost || 0))
              return
            }
            if (seenNames.has(name)) return
            seenNames.add(name)

            const val = Number(c.price ?? c.cost ?? 0)
            negItems.push({
              id: `breakdown-${idx}-${name}`,
              name,
              method: 'fixed',
              percentage: '—',
              value: val,
              originalValue: val,
            })
          })
        }
      }

      setNegotiationCosts(negItems)
      setManualCostOverrides({})
      setDenominatorError(null)

      const initialDiscount = Number(proposal.discount_amount) || 0
      setDiscountPercentInput(initialDiscount)
      const initialTotal = Number(proposal.total_value || proposal.price) || 0
      setFinalPriceInput(initialTotal)
      setInputMode('percent')

      // Mantém Composição de Custos recolhida por padrão
      setExpandedComposition(false)
      setExpandedKit(true)
      setExpandedNegotiationCosts(true)
      setExpandedPostDiscount(true)
    }
  }, [open, proposal])

  // Estado para indicar feedback de recálculo em andamento (spinner / lápis)
  const [isCalculating, setIsCalculating] = useState(false)
  const [editingCostName, setEditingCostName] = useState<string | null>(null)

  // Total do Kit: se tem itens detalhados soma eles, senão usa kitTotalCost
  const kitTotal = useMemo(() => {
    if (kitItems.length > 0) {
      return kitItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0)
    }
    return kitTotalCost
  }, [kitItems, kitTotalCost])

  const hasKitItems = kitItems.length > 0

  // Lista ordenada alfabeticamente para o Kit Fotovoltaico
  const sortedKitItems = useMemo(() => {
    return [...kitItems].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
  }, [kitItems])

  // Lista ordenada alfabeticamente para os Custos de Negociação
  const sortedNegotiationCosts = useMemo(() => {
    return [...negotiationCosts].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'))
  }, [negotiationCosts])

  // Objeto PricingLike com os dados atuais da proposta
  // Usa originalValue como baseline estável para que itens percentuais possam recalcular
  // dinamicamente em tempo real sobre a nova base de venda sem perder a referência original
  // Fixos e variáveis mantêm seu valor pois não dependem do preço de venda
  const basePricingLike = useMemo(() => {
    const rawPricing = snapshot?.pricing || {}
    const rawSettings = rawPricing.settings || snapshot?.settings || {}

    // Converte negotiationCosts de volta para appliedCosts estruturados
    const appliedCosts = negotiationCosts.map((c) => {
      // Se tiver override manual neste custo, usa o override; senão usa originalValue
      const overriddenVal = manualCostOverrides[c.name]
      const effectiveAmount =
        overriddenVal !== undefined ? overriddenVal : (c.originalValue ?? c.value)

      return {
        name: c.name,
        method: c.method as any,
        value: c.rawValue ?? c.value,
        amount: effectiveAmount,
        calculatedAmount: effectiveAmount,
        taxWeight: c.taxWeight,
        multiplier: c.multiplier,
        calcBase: c.calcBase,
        baseValue: c.baseValue,
      }
    })

    return {
      autoKitPrice: rawPricing.autoKitPrice || kitTotal,
      kitPrice: kitTotal,
      fixedCosts: rawPricing.fixedCosts || 0,
      varCosts: rawPricing.varCosts || 0,
      rateSum: rawPricing.rateSum || 0,
      taxSum: rawPricing.taxSum || 0,
      marginSum: rawPricing.marginSum || 0,
      kitPercentSum: rawPricing.kitPercentSum || 0,
      commissionSum: rawPricing.commissionSum || 0,
      appliedCosts,
      settings: rawSettings,
    }
  }, [snapshot, kitTotal, negotiationCosts, manualCostOverrides])

  // Detecta se o kit foi alterado em relação ao original
  const isKitModified = useMemo(() => {
    return Math.abs(kitTotal - originalKitPrice) > 0.01
  }, [kitTotal, originalKitPrice])

  // Subtotal base (pré-desconto) calculado pelo motor 2 respeitando manual overrides se existirem
  // ou forçando o recálculo quando o kit foi alterado (recomputeBaseSale: true)
  const recalcWithoutDiscount = useMemo(() => {
    const billingModel = (snapshot?.pricing?.settings?.billing_model ||
      snapshot?.settings?.billing_model) as string | undefined

    const fallbackSubtotal =
      kitTotal + negotiationCosts.reduce((acc, c) => acc + (Number(c.value) || 0), 0)

    const initialSubtotal =
      Number(snapshot?.pricing?.salePrice) ||
      Number(proposal?.price) ||
      Number(proposal?.total_value) ||
      fallbackSubtotal

    return recalcPricingWithDiscount({
      subtotal: initialSubtotal > 0 ? initialSubtotal : fallbackSubtotal,
      discountPercent: 0,
      pricing: basePricingLike,
      billingModel,
      costOverrides: manualCostOverrides,
      recomputeBaseSale: isKitModified,
    })
  }, [
    basePricingLike,
    kitTotal,
    negotiationCosts,
    snapshot,
    proposal,
    manualCostOverrides,
    isKitModified,
  ])

  // Subtotal base pré-desconto real
  const baseSubtotal = useMemo(() => {
    if (recalcWithoutDiscount && recalcWithoutDiscount.baseTotal > 0) {
      return recalcWithoutDiscount.baseTotal
    }
    return kitTotal + negotiationCosts.reduce((acc, c) => acc + (Number(c.value) || 0), 0)
  }, [recalcWithoutDiscount, kitTotal, negotiationCosts])

  // Sincroniza o modo de entrada
  const handleDiscountPercentChange = (val: number) => {
    setDiscountPercentInput(val)
    if (baseSubtotal > 0) {
      const derivedFinal = baseSubtotal * (1 - val / 100)
      setFinalPriceInput(Number(derivedFinal.toFixed(2)))
    }
  }

  const handleFinalPriceChange = (val: number) => {
    setFinalPriceInput(val)
    if (baseSubtotal > 0) {
      const derivedDiscountVal = baseSubtotal - val
      const derivedPct = (derivedDiscountVal / baseSubtotal) * 100
      setDiscountPercentInput(Number(derivedPct.toFixed(2)))
    }
  }

  // Recálculo ativo com desconto e eventuais overrides manuais
  const activeRecalc = useMemo(() => {
    if (baseSubtotal <= 0) return null
    const billingModel = (snapshot?.pricing?.settings?.billing_model ||
      snapshot?.settings?.billing_model) as string | undefined

    if (inputMode === 'final_price') {
      return recalcPricingWithDiscount({
        subtotal: baseSubtotal,
        targetSalePrice: finalPriceInput,
        pricing: basePricingLike,
        billingModel,
        costOverrides: manualCostOverrides,
        recomputeBaseSale: isKitModified,
      })
    } else {
      return recalcPricingWithDiscount({
        subtotal: baseSubtotal,
        discountPercent: discountPercentInput,
        pricing: basePricingLike,
        billingModel,
        costOverrides: manualCostOverrides,
        recomputeBaseSale: isKitModified,
      })
    }
  }, [
    baseSubtotal,
    inputMode,
    finalPriceInput,
    discountPercentInput,
    basePricingLike,
    snapshot,
    manualCostOverrides,
    isKitModified,
  ])

  // Map rápido com os valores recalculados em tempo real de cada custo (motor 2)
  // Permite que a tabela de custos mostre na hora os novos valores dos itens percentuais
  // (impostos, comissão, etc.) e os itens editados, enquanto fixos não-editados mantêm o valor.
  const recalculatedAmountsMap = useMemo(() => {
    const map = new Map<string, number>()
    // Se há desconto ou recálculo ativo, usamos activeRecalc; senão recalcWithoutDiscount
    const sourceRecalc = activeRecalc || recalcWithoutDiscount
    if (sourceRecalc?.appliedCosts && sourceRecalc.appliedCosts.length > 0) {
      sourceRecalc.appliedCosts.forEach((c) => {
        if (c.name && c.calculatedAmount !== undefined && c.calculatedAmount !== null) {
          map.set(c.name, c.calculatedAmount)
        }
      })
    }
    return map
  }, [activeRecalc, recalcWithoutDiscount])

  // Desconto efetivo
  const effectiveDiscountPercent = activeRecalc
    ? activeRecalc.discountPercent
    : discountPercentInput
  const effectiveDiscountValue = activeRecalc
    ? activeRecalc.discountValue
    : (baseSubtotal * discountPercentInput) / 100
  const effectiveFinalTotal = activeRecalc
    ? activeRecalc.finalTotal
    : baseSubtotal - effectiveDiscountValue

  // Validação de limite de desconto
  const discountExceeded = !isAdmin && effectiveDiscountPercent > maxDiscount + 0.01

  // Há desconto lançado? (seja percentual ou valor)
  const hasDiscountApplied = effectiveDiscountPercent > 0.001 || effectiveDiscountValue > 0.01

  // Edição manual de um custo de negociação em R$
  const handleNegotiationCostChange = (costName: string, val: number | null) => {
    const newVal = val ?? 0
    const nextOverrides = {
      ...manualCostOverrides,
      [costName]: newVal,
    }

    setEditingCostName(costName)
    setIsCalculating(true)

    // Tenta recalcular para validar se não atinge o guard de alíquota >= 1
    const billingModel = (snapshot?.pricing?.settings?.billing_model ||
      snapshot?.settings?.billing_model) as string | undefined

    let warningEncountered: string | null = null
    const testRecalc = recalcPricingWithDiscount({
      subtotal: baseSubtotal,
      discountPercent: discountPercentInput,
      pricing: basePricingLike,
      billingModel,
      costOverrides: nextOverrides,
      onDenominatorWarning: (msg) => {
        warningEncountered = msg
      },
    })

    if (!testRecalc && warningEncountered) {
      setDenominatorError(warningEncountered)
      setIsCalculating(false)
      toast({
        variant: 'destructive',
        title: 'Ajuste bloqueado',
        description: warningEncountered,
      })
      return
    }

    setDenominatorError(null)
    setManualCostOverrides(nextOverrides)

    // Atualiza a visualização local do item
    setNegotiationCosts((prev) =>
      prev.map((item) =>
        item.name === costName
          ? {
              ...item,
              value: newVal,
              isOverridden: true,
            }
          : item,
      ),
    )

    // Breve feedback visual de cálculo concluído
    setTimeout(() => {
      setIsCalculating(false)
    }, 250)
  }

  // Edição de item do kit
  const handleKitItemChange = (itemName: string, val: number | null) => {
    setEditingCostName(itemName)
    setIsCalculating(true)
    setKitItems((prev) =>
      prev.map((item) => (item.name === itemName ? { ...item, total: val || 0 } : item)),
    )
    setTimeout(() => {
      setIsCalculating(false)
    }, 250)
  }

  // Edição direta do total do kit (quando não tem kitItems)
  const handleKitTotalChange = (val: number | null) => {
    setEditingCostName('Kit Fotovoltaico')
    setIsCalculating(true)
    setKitTotalCost(val || 0)
    setTimeout(() => {
      setIsCalculating(false)
    }, 250)
  }

  // "Recalcular do zero": limpa os ajustes manuais e restaura os valores originais da regra da companhia
  const handleResetToRule = useCallback(() => {
    setManualCostOverrides({})
    setDenominatorError(null)

    // Restaura valores originais de kitItems e kitTotalCost
    setKitItems(originalKitItems.map((item) => ({ ...item })))
    setKitTotalCost(originalKitPrice)

    // Restaura valores originais de negotiationCosts
    setNegotiationCosts((prev) =>
      prev.map((c) => ({
        ...c,
        value: c.originalValue,
        isOverridden: false,
      })),
    )

    toast({
      title: 'Custos recomputados pela regra original',
      description: 'Ajustes manuais foram removidos.',
    })
  }, [originalKitItems, originalKitPrice, toast])

  // Salvar proposta atualizada
  const handleSave = async () => {
    if (discountExceeded || denominatorError) return
    setLoading(true)
    try {
      const newSubtotal = baseSubtotal
      const newFinal = effectiveFinalTotal
      const finalDiscountPct =
        effectiveDiscountPercent > 0 ? Number(effectiveDiscountPercent.toFixed(2)) : 0

      // Breakdown estruturado sem duplicação
      const cost_breakdown = [
        {
          name: 'Kit Fotovoltaico (Equipamentos e Insumos)',
          cost: kitTotal,
          margin: 0,
          price: kitTotal,
        },
        ...negotiationCosts.map((c) => ({
          name: c.name,
          cost: c.value,
          margin: 0,
          price: c.value,
        })),
      ]

      const updatedSnapshot = { ...snapshot }
      if (updatedSnapshot.pricing) {
        updatedSnapshot.pricing.kitPrice = kitTotal
        if (hasKitItems) {
          updatedSnapshot.pricing.kitComposition = kitItems
        }
        updatedSnapshot.pricing.salePrice = newSubtotal

        if (updatedSnapshot.pricing.appliedCosts) {
          updatedSnapshot.pricing.appliedCosts = updatedSnapshot.pricing.appliedCosts.map(
            (c: any) => {
              const updated = negotiationCosts.find((nc) => nc.name === c.name)
              if (updated) {
                return {
                  ...c,
                  calculatedAmount: updated.value,
                  amount: updated.value,
                  isOverridden: !!manualCostOverrides[c.name],
                }
              }
              return c
            },
          )
        }

        if (activeRecalc) {
          updatedSnapshot.pricing.salePriceWithDiscount = activeRecalc.finalTotal
          updatedSnapshot.pricing.discount = {
            percent: activeRecalc.discountPercent,
            value: activeRecalc.discountValue,
            base: activeRecalc.baseTotal,
          }
          updatedSnapshot.pricing.marginFinal = activeRecalc.marginAmount
          updatedSnapshot.pricing.marginFinalPct = activeRecalc.marginPct
          if (activeRecalc.appliedCosts) {
            updatedSnapshot.pricing.appliedCosts = activeRecalc.appliedCosts
          }
        }
      }

      updatedSnapshot.cost_breakdown = cost_breakdown

      const { generatorSyncFailed } = await saveAndRegenerateProposal({
        proposal,
        updatedSnapshot,
        saveFinalTotal: newFinal,
        subtotal: newSubtotal,
        saveDiscountPct: finalDiscountPct,
        costBreakdown: cost_breakdown,
        user,
      })

      if (generatorSyncFailed) {
        toast({
          variant: 'destructive',
          title: 'Custos salvos no CRM, mas não no Gerador',
          description:
            'Os dados foram atualizados no banco, mas houve falha ao sincronizar o documento no Gerador.',
        })
      } else {
        toast({ title: 'Custos atualizados e proposta regenerada com sucesso' })
      }

      reload?.()
      onOpenChange(false)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message })
    } finally {
      setLoading(false)
    }
  }

  // Não-administradores visualizam apenas o valor total
  if (!isAdmin) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valor da Proposta</DialogTitle>
            <VisuallyHidden>
              <DialogDescription>Valor total da proposta comercial.</DialogDescription>
            </VisuallyHidden>
          </DialogHeader>
          <div className="py-12 text-center">
            <p className="text-muted-foreground mb-2">Valor Total da Venda</p>
            <p className="text-3xl font-bold text-primary">
              {brl2(proposal?.total_value || proposal?.price || 0)}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  const hasManualAdjustments = Object.keys(manualCostOverrides).length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>Custos e Precificação da Proposta</DialogTitle>
            {hasManualAdjustments && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetToRule}
                className="h-8 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recalcular do zero</span>
              </Button>
            )}
          </div>
          <VisuallyHidden>
            <DialogDescription>
              Visualize a composição de custos da proposta, ajuste descontos ou valores manuais e
              confira o recálculo final.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <TooltipProvider delayDuration={200}>
          <div className="space-y-4 py-2">
            {/* Aviso se o denominador tiver atingido o guard */}
            {denominatorError && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{denominatorError}</span>
              </div>
            )}

            {/* BLOCO RECOLHÍVEL POR PADRÃO: "Composição de Custos" (sem "(pré-desconto)") */}
            <div className="border rounded-lg overflow-hidden bg-card">
              <button
                type="button"
                className="w-full flex items-center justify-between p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors font-semibold text-sm text-foreground text-left"
                onClick={() => setExpandedComposition(!expandedComposition)}
              >
                <div className="flex items-center gap-2">
                  {expandedComposition ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>Composição de Custos</span>
                  {hasManualAdjustments && (
                    <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-primary/10 text-primary">
                      Ajuste manual
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isCalculating && (
                    <span className="flex items-center gap-1 text-[11px] text-primary font-normal">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Recalculando...
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground font-normal">Subtotal:</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {brl2(baseSubtotal)}
                  </span>
                </div>
              </button>

              {expandedComposition && (
                <div className="border-t p-4 space-y-4">
                  {/* SUBGRUPO 1: Kit Fotovoltaico */}
                  <div className="border rounded-md overflow-hidden bg-background">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/30 transition-colors text-xs font-semibold text-foreground text-left"
                      onClick={() => setExpandedKit(!expandedKit)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedKit ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <Package className="w-4 h-4 text-primary" />
                        <span>Kit Fotovoltaico</span>
                        {hasKitItems && (
                          <span className="text-[11px] text-muted-foreground font-normal">
                            ({kitItems.length} {kitItems.length === 1 ? 'item' : 'itens'})
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-foreground tabular-nums">
                        {brl2(kitTotal)}
                      </span>
                    </button>

                    {expandedKit && (
                      <div className="p-3 border-t">
                        {hasKitItems ? (
                          <div className="space-y-2">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-muted-foreground border-b text-[11px]">
                                  <th className="text-left pb-1.5 font-medium">
                                    Equipamento / Insumo
                                  </th>
                                  <th className="text-center pb-1.5 font-medium w-24">Qtd.</th>
                                  <th className="text-right pb-1.5 font-medium w-36">Total (R$)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sortedKitItems.map((item, kIdx) => (
                                  <tr
                                    key={`kit-item-${item.name}-${kIdx}`}
                                    className="border-b last:border-0"
                                  >
                                    <td className="py-2 text-foreground font-medium">
                                      {item.name}
                                    </td>
                                    <td className="py-2 text-center text-muted-foreground tabular-nums">
                                      {item.qty?.toLocaleString('pt-BR', {
                                        maximumFractionDigits: 2,
                                      })}
                                    </td>
                                    <td className="py-2 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="text-muted-foreground text-xs">R$</span>
                                        <NumericInput
                                          value={item.total ?? 0}
                                          onChangeValue={(val) =>
                                            handleKitItemChange(item.name, val)
                                          }
                                          precision={2}
                                          className="w-32 text-right text-xs h-8"
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between py-1">
                            <span className="text-xs text-muted-foreground">
                              Custo do Kit Fotovoltaico:
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground text-xs">R$</span>
                              <NumericInput
                                value={kitTotalCost}
                                onChangeValue={handleKitTotalChange}
                                precision={2}
                                className="w-36 text-right text-xs h-8 font-medium"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SUBGRUPO 2: Custos Negociação */}
                  <div className="border rounded-md overflow-hidden bg-background">
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-muted/20 hover:bg-muted/30 transition-colors text-xs font-semibold text-foreground text-left"
                      onClick={() => setExpandedNegotiationCosts(!expandedNegotiationCosts)}
                    >
                      <div className="flex items-center gap-2">
                        {expandedNegotiationCosts ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <Receipt className="w-4 h-4 text-primary" />
                        <span>Custos Negociação</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[11px] text-muted-foreground cursor-help font-normal">
                              ({negotiationCosts.length}{' '}
                              {negotiationCosts.length === 1 ? 'item' : 'itens'})
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs max-w-xs">
                            Impostos, comissões, fixos e variáveis da regra da companhia
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="font-bold text-foreground tabular-nums">
                        {brl2(negotiationCosts.reduce((acc, c) => acc + (Number(c.value) || 0), 0))}
                      </span>
                    </button>

                    {expandedNegotiationCosts && (
                      <div className="border-t">
                        {negotiationCosts.length === 0 ? (
                          <p className="text-muted-foreground text-center p-4 text-xs">
                            Nenhum custo de negociação cadastrado.
                          </p>
                        ) : (
                          <table className="w-full text-xs">
                            <thead className="bg-muted/20 border-b text-[11px] text-muted-foreground">
                              <tr>
                                <th className="text-left p-2.5 font-medium">Descrição</th>
                                <th className="text-center p-2.5 font-medium w-28">Alíquota (%)</th>
                                <th className="text-right p-2.5 font-medium w-36">Valor (R$)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedNegotiationCosts.map((c) => {
                                const isOverridden = !!manualCostOverrides[c.name]
                                const highlightedRole = isMarginOrCommission(c.name, c.method)
                                const isBeingEdited = editingCostName === c.name

                                // Valor recalculado em tempo real:
                                // Se o item foi editado manualmente, usa o valor sobrescrito;
                                // Se for percentual, lê do recalculatedAmountsMap (derivado do recálculo live);
                                // Senão, mantém o valor original
                                const liveValue =
                                  manualCostOverrides[c.name] !== undefined
                                    ? manualCostOverrides[c.name]
                                    : (recalculatedAmountsMap.get(c.name) ?? c.value)

                                return (
                                  <tr
                                    key={c.id}
                                    className={cn(
                                      'border-b last:border-0 transition-colors',
                                      highlightedRole === 'margin' &&
                                        'bg-emerald-50/60 dark:bg-emerald-950/20 font-medium',
                                      highlightedRole === 'commission' &&
                                        'bg-blue-50/60 dark:bg-blue-950/20 font-medium',
                                      !highlightedRole && 'hover:bg-muted/10',
                                    )}
                                  >
                                    <td className="p-2.5 font-medium text-foreground">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span>{c.name}</span>
                                        {highlightedRole === 'margin' && (
                                          <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                            Margem
                                          </span>
                                        )}
                                        {highlightedRole === 'commission' && (
                                          <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                            Comissão
                                          </span>
                                        )}
                                        {isOverridden && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-normal">
                                                editado
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent className="text-xs">
                                              Item desembaraçado: fixado em R$ no numerador
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    </td>
                                    <td className="p-2.5 text-center text-muted-foreground tabular-nums">
                                      {c.percentage}
                                    </td>
                                    <td className="p-2.5 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        {isBeingEdited && (
                                          <Pencil className="w-3 h-3 text-primary animate-pulse" />
                                        )}
                                        <span className="text-muted-foreground text-xs">R$</span>
                                        <NumericInput
                                          value={liveValue ?? 0}
                                          onChangeValue={(val) =>
                                            handleNegotiationCostChange(c.name, val)
                                          }
                                          precision={2}
                                          className={cn(
                                            'w-32 text-right text-xs h-8',
                                            isOverridden &&
                                              'border-primary/50 bg-primary/5 font-semibold text-primary',
                                            highlightedRole === 'margin' &&
                                              'border-emerald-300/60 dark:border-emerald-700/60',
                                            highlightedRole === 'commission' &&
                                              'border-blue-300/60 dark:border-blue-700/60',
                                          )}
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* BLOCO: Ajuste de Preço de Venda (Desconto % vs Valor Final R$) */}
            <div className="border rounded-lg p-3.5 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-sm text-foreground">
                    Ajuste de Preço de Venda
                  </h4>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Layers className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Desconto em % ou valor final em R$. A margem absorve o ajuste e custos
                      percentuais se recalculam.
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1 bg-muted p-1 rounded-md text-xs">
                  <button
                    type="button"
                    onClick={() => setInputMode('percent')}
                    className={cn(
                      'px-2.5 py-1 rounded transition-colors font-medium',
                      inputMode === 'percent'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Por Desconto (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('final_price')}
                    className={cn(
                      'px-2.5 py-1 rounded transition-colors font-medium',
                      inputMode === 'final_price'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Por Valor Final (R$)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Desconto (%)</Label>
                    <span className="text-[11px] text-muted-foreground">
                      Máx: {pct2(maxDiscount)}%
                    </span>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={isAdmin ? 100 : maxDiscount}
                    value={discountPercentInput || ''}
                    disabled={inputMode !== 'percent'}
                    onChange={(e) => handleDiscountPercentChange(Number(e.target.value))}
                    className={cn(
                      'text-sm',
                      inputMode !== 'percent' && 'bg-muted/50 cursor-not-allowed',
                    )}
                    placeholder="0,00"
                  />
                  {inputMode === 'final_price' && (
                    <p className="text-[11px] text-muted-foreground">
                      Derivado: {pct2(effectiveDiscountPercent)}%
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Valor Final de Venda (R$)</Label>
                    <span className="text-[11px] text-muted-foreground">
                      Base: {brl2(baseSubtotal)}
                    </span>
                  </div>
                  <NumericInput
                    value={effectiveFinalTotal}
                    precision={2}
                    disabled={inputMode !== 'final_price'}
                    onChangeValue={(val) => handleFinalPriceChange(val || 0)}
                    className={cn(
                      'text-sm font-semibold',
                      inputMode !== 'final_price' && 'bg-muted/50 cursor-not-allowed',
                    )}
                  />
                  {effectiveDiscountValue > 0 && (
                    <p className="text-[11px] text-destructive">
                      Diferença: - {brl2(effectiveDiscountValue)}
                    </p>
                  )}
                </div>
              </div>

              {discountExceeded && (
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Desconto de {pct2(effectiveDiscountPercent)}% excede o limite máximo permitido (
                    {pct2(maxDiscount)}%).
                  </span>
                </div>
              )}
            </div>

            {/* BLOCO CONDICIONAL: "Após o Desconto" — SÓ aparece quando HÁ desconto aplicado */}
            {hasDiscountApplied && (
              <div className="border rounded-lg overflow-hidden bg-card">
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors font-semibold text-sm text-foreground text-left"
                  onClick={() => setExpandedPostDiscount(!expandedPostDiscount)}
                >
                  <div className="flex items-center gap-2">
                    {expandedPostDiscount ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span>Após o Desconto</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-normal">Venda final:</span>
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {brl2(effectiveFinalTotal)}
                    </span>
                  </div>
                </button>

                {expandedPostDiscount && (
                  <div className="p-4 space-y-3 border-t">
                    {activeRecalc && activeRecalc.detail && activeRecalc.detail.length > 0 && (
                      <div className="border rounded-md overflow-hidden text-xs">
                        <table className="w-full">
                          <thead className="bg-muted/30 border-b text-muted-foreground text-[11px]">
                            <tr>
                              <th className="text-left p-2.5 font-medium">Item Recalculado</th>
                              <th className="text-left p-2.5 font-medium">Base de Incidência</th>
                              <th className="text-right p-2.5 font-medium w-32">Novo Valor (R$)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeRecalc.detail.map((item, idx) => {
                              const highlightedRole = isMarginOrCommission(item.name)
                              return (
                                <tr
                                  key={`recalc-detail-${idx}`}
                                  className={cn(
                                    'border-b last:border-0 transition-colors',
                                    highlightedRole === 'margin' &&
                                      'bg-emerald-50/60 dark:bg-emerald-950/20 font-medium',
                                    highlightedRole === 'commission' &&
                                      'bg-blue-50/60 dark:bg-blue-950/20 font-medium',
                                    !highlightedRole && 'hover:bg-muted/10',
                                  )}
                                >
                                  <td className="p-2.5 font-medium text-foreground">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span>{item.name}</span>
                                      {highlightedRole === 'margin' && (
                                        <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                                          Margem
                                        </span>
                                      )}
                                      {highlightedRole === 'commission' && (
                                        <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                                          Comissão
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-muted-foreground">{item.label}</td>
                                  <td className="p-2.5 text-right tabular-nums text-foreground">
                                    {brl2(item.amount)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {activeRecalc && (
                      <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-lg space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-amber-800">Venda Base:</span>
                          <span className="font-semibold text-amber-950 tabular-nums">
                            {brl2(activeRecalc.baseTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-amber-800">
                            Desconto Aplicado ({pct2(activeRecalc.discountPercent)}%):
                          </span>
                          <span className="font-semibold text-destructive tabular-nums">
                            - {brl2(activeRecalc.discountValue)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-amber-800">Total de Custos Recalculados:</span>
                          <span className="font-semibold text-destructive tabular-nums">
                            - {brl2(activeRecalc.costsTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-amber-200 text-sm font-bold">
                          <span className="text-amber-950">Margem Real Resultante:</span>
                          <span
                            className={cn(
                              'tabular-nums',
                              activeRecalc.marginAmount >= 0
                                ? 'text-emerald-700'
                                : 'text-destructive',
                            )}
                          >
                            {brl2(activeRecalc.marginAmount)} ({pct2(activeRecalc.marginPct * 100)}
                            %)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Resumo Final de Fechamento */}
            <div className="bg-muted/40 p-3.5 rounded-lg border space-y-1.5 text-sm">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal Base:</span>
                <span className="tabular-nums font-medium text-foreground">
                  {brl2(baseSubtotal)}
                </span>
              </div>
              {hasDiscountApplied && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Desconto ({pct2(effectiveDiscountPercent)}%):</span>
                  <span className="tabular-nums font-medium text-destructive">
                    - {brl2(effectiveDiscountValue)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t text-foreground">
                <span>Total Final da Proposta:</span>
                <span className="text-primary tabular-nums">{brl2(effectiveFinalTotal)}</span>
              </div>
            </div>
          </div>
        </TooltipProvider>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <div>
            {hasManualAdjustments && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToRule}
                className="text-xs text-muted-foreground flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recalcular do zero</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || discountExceeded || !!denominatorError}
            >
              Salvar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
