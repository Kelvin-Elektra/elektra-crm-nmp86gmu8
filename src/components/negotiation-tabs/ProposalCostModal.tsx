import { useState, useEffect, useMemo, Fragment } from 'react'
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
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'
import { recalcPricingWithDiscount } from '@/lib/discount-recalc'
import { ChevronDown, ChevronRight, Package, Info, AlertTriangle } from 'lucide-react'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

interface CostItem {
  name: string
  method: string
  percentage: string
  value: number
}

function pct2(v: number): string {
  return (Number(v) || 0).toFixed(2)
}

function brl2(v: number): string {
  return BRL.format(Number(v) || 0)
}

interface KitItem {
  name: string
  qty: number
  total: number
  type: string
  ruleApplied?: boolean
}

export function ProposalCostModal({ open, onOpenChange, proposal, reload, neg }: any) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [costs, setCosts] = useState<CostItem[]>([])
  const [kitItems, setKitItems] = useState<KitItem[]>([])
  const [snapshot, setSnapshot] = useState<any>(null)
  const [expandedKit, setExpandedKit] = useState(true)
  const [marginSum, setMarginSum] = useState(0)

  // Controle de blocos recolhíveis
  const [expandedPreDiscount, setExpandedPreDiscount] = useState(true)
  const [expandedPostDiscount, setExpandedPostDiscount] = useState(true)

  // Modo duplo de entrada: 'percent' ou 'final_price'
  const [inputMode, setInputMode] = useState<'percent' | 'final_price'>('percent')
  const [discountPercentInput, setDiscountPercentInput] = useState<number>(0)
  const [finalPriceInput, setFinalPriceInput] = useState<number>(0)

  const isAdmin =
    user?.role === 'User_elektra' || user?.role_company === 'admin' || user?.role === 'User_owner'

  const maxDiscount = Number((user as any)?.max_discount) || 0

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
      const appliedCosts = pricing.appliedCosts || []
      const kitPrice = pricing.kitPrice || 0
      const marginSumVal = pricing.marginSum || 0
      const salePrice = pricing.salePrice || proposal.price || proposal.total_value || 0
      const kitComposition = Array.isArray(pricing.kitComposition) ? pricing.kitComposition : []
      setMarginSum(marginSumVal)

      let costItems: CostItem[] = []

      if (appliedCosts.length > 0) {
        costItems.push({
          name: 'Kit Fotovoltaico (Equipamentos e Insumos)',
          method: 'kit',
          percentage: '—',
          value: kitPrice,
        })
        appliedCosts.forEach((c: any) => {
          const isPercent = ['rate', 'tax', 'margin', 'kit_percent', 'commission'].includes(
            c.method,
          )
          const weightLabel =
            c.method === 'tax' && c.taxWeight != null ? ` • Peso: ${pct2(c.taxWeight)}%` : ''
          let displayValue = c.calculatedAmount || c.amount || 0
          if (c.method === 'tax') {
            const rate = (Number(c.value) || 0) / 100
            const weight = (Number(c.taxWeight) || 100) / 100
            const billingModel =
              pricing.settings?.billing_model || snap.settings?.billing_model || 'direct'
            const totalBase =
              billingModel === 'intermediated' ? Math.max(0, salePrice - kitPrice) : salePrice
            displayValue = totalBase * rate * weight
          }
          costItems.push({
            name: c.name,
            method: c.method,
            percentage: isPercent ? `${pct2(c.value)}%${weightLabel}` : '—',
            value: displayValue,
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
        costItems = breakdown.map((c: any) => ({
          name: c.name,
          method: 'fixed',
          percentage: '—',
          value: c.price || c.cost || 0,
        }))
      }

      setCosts(costItems)
      setKitItems(kitComposition.map((item: any) => ({ ...item })))
      setExpandedKit(true)

      const initialDiscount = Number(proposal.discount_amount) || 0
      setDiscountPercentInput(initialDiscount)
      const initialTotal = Number(proposal.total_value || proposal.price) || 0
      setFinalPriceInput(initialTotal)
      setInputMode('percent')
    }
  }, [open, proposal])

  const kitTotal = useMemo(
    () => kitItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0),
    [kitItems],
  )

  const hasKitItems = kitItems.length > 0

  // Subtotal base (pré-desconto)
  const baseSubtotal = useMemo(() => {
    return costs.reduce((acc, c) => {
      if (c.method === 'kit' && hasKitItems) return acc + kitTotal
      return acc + (Number(c.value) || 0)
    }, 0)
  }, [costs, kitTotal, hasKitItems])

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

  // Recálculo ativo com desconto ou targetSalePrice
  const activeRecalc = useMemo(() => {
    if (baseSubtotal <= 0) return null
    const billingModel = (snapshot?.pricing?.settings?.billing_model ||
      snapshot?.settings?.billing_model) as string | undefined

    if (inputMode === 'final_price') {
      return recalcPricingWithDiscount({
        subtotal: baseSubtotal,
        targetSalePrice: finalPriceInput,
        pricing: snapshot?.pricing,
        billingModel,
      })
    } else {
      return recalcPricingWithDiscount({
        subtotal: baseSubtotal,
        discountPercent: discountPercentInput,
        pricing: snapshot?.pricing,
        billingModel,
      })
    }
  }, [baseSubtotal, inputMode, finalPriceInput, discountPercentInput, snapshot])

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

  // Validação de limite
  const discountExceeded = !isAdmin && effectiveDiscountPercent > maxDiscount + 0.01

  const handleCostChange = (idx: number, val: number | null) => {
    const arr = [...costs]
    arr[idx].value = val || 0
    setCosts(arr)
  }

  const handleKitItemChange = (idx: number, val: number | null) => {
    const arr = [...kitItems]
    arr[idx].total = val || 0
    setKitItems(arr)
  }

  const handleSave = async () => {
    if (discountExceeded) return
    setLoading(true)
    try {
      const newSubtotal = baseSubtotal
      const newFinal = effectiveFinalTotal
      const finalDiscountPct =
        effectiveDiscountPercent > 0 ? Number(effectiveDiscountPercent.toFixed(2)) : 0

      const cost_breakdown = costs.map((c) => {
        if (c.method === 'kit' && hasKitItems) {
          return { name: c.name, cost: kitTotal, margin: 0, price: kitTotal }
        }
        return { name: c.name, cost: c.value, margin: 0, price: c.value }
      })

      const updatedSnapshot = { ...snapshot }
      if (updatedSnapshot.pricing) {
        if (hasKitItems) {
          updatedSnapshot.pricing.kitPrice = kitTotal
          updatedSnapshot.pricing.kitComposition = kitItems
        }
        updatedSnapshot.pricing.salePrice = newSubtotal
        if (updatedSnapshot.pricing.appliedCosts) {
          updatedSnapshot.pricing.appliedCosts = updatedSnapshot.pricing.appliedCosts.map(
            (c: any) => {
              const updated = costs.find((nc) => nc.name === c.name && nc.method !== 'kit')
              if (updated) {
                return { ...c, calculatedAmount: updated.value, amount: updated.value }
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
        }
      }

      await pb.collection('proposals').update(proposal.id, {
        cost_breakdown,
        discount_amount: finalDiscountPct,
        price: newSubtotal,
        total_value: newFinal,
        snapshot_data: updatedSnapshot,
      })

      toast({ title: 'Custos atualizados e preço recalculado' })
      reload()
      onOpenChange(false)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custos e Precificação da Proposta</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              Visualize a composição de custos pré-desconto, configure desconto ou valor final
              direto, e confira os custos recalculados.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <TooltipProvider delayDuration={200}>
          <div className="space-y-4 py-3">
            {/* Bloco 1: Composição de Custos Pré-Desconto */}
            <div className="border rounded-lg overflow-hidden bg-card">
              <button
                type="button"
                className="w-full flex items-center justify-between p-3.5 bg-muted/40 hover:bg-muted/60 transition-colors font-semibold text-sm text-foreground text-left"
                onClick={() => setExpandedPreDiscount(!expandedPreDiscount)}
              >
                <div className="flex items-center gap-2">
                  {expandedPreDiscount ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span>Composição de Custos (Pré-Desconto)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-normal">Subtotal base:</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">
                    {brl2(baseSubtotal)}
                  </span>
                </div>
              </button>

              {expandedPreDiscount && (
                <div className="border-t">
                  {costs.length === 0 ? (
                    <p className="text-muted-foreground text-center p-6 text-sm">
                      Nenhum detalhamento de custo salvo para esta proposta.
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 border-b text-xs text-muted-foreground">
                        <tr>
                          <th className="text-left p-3 font-medium">Descrição</th>
                          <th className="text-center p-3 font-medium w-32">Percentual (%)</th>
                          <th className="text-right p-3 font-medium w-40">Valor (R$)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {costs.map((c, idx) => {
                          const isKit = c.method === 'kit'
                          const kitReadOnly = isKit && hasKitItems
                          return (
                            <Fragment key={`cost-${idx}`}>
                              <tr className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                <td className="p-3">
                                  {isKit ? (
                                    <button
                                      type="button"
                                      className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
                                      onClick={() => setExpandedKit(!expandedKit)}
                                    >
                                      {expandedKit ? (
                                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                      )}
                                      <Package className="w-4 h-4 text-primary" />
                                      {c.name}
                                    </button>
                                  ) : (
                                    <span className="font-medium text-foreground">{c.name}</span>
                                  )}
                                </td>
                                <td className="p-3 text-center text-muted-foreground tabular-nums text-xs">
                                  {c.percentage}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-muted-foreground text-xs">R$</span>
                                    <NumericInput
                                      value={kitReadOnly ? kitTotal : (c.value ?? 0)}
                                      onChangeValue={(val) => handleCostChange(idx, val)}
                                      readOnly={kitReadOnly}
                                      precision={2}
                                      className={cn(
                                        'w-36 text-right font-medium text-sm',
                                        kitReadOnly &&
                                          'bg-muted cursor-not-allowed text-muted-foreground',
                                      )}
                                    />
                                  </div>
                                </td>
                              </tr>
                              {isKit &&
                                expandedKit &&
                                hasKitItems &&
                                kitItems.map((item, kIdx) => (
                                  <tr
                                    key={`kit-${kIdx}`}
                                    className="bg-muted/10 border-b last:border-0"
                                  >
                                    <td className="p-2.5 pl-10 text-muted-foreground">
                                      <span className="text-xs">{item.name}</span>
                                      <span className="ml-2 text-[11px] text-muted-foreground/70">
                                        (
                                        {item.qty?.toLocaleString('pt-BR', {
                                          maximumFractionDigits: 2,
                                        })}
                                        x)
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-center text-muted-foreground/40 text-xs">
                                      —
                                    </td>
                                    <td className="p-2.5 text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <span className="text-muted-foreground text-xs">R$</span>
                                        <NumericInput
                                          value={item.total ?? 0}
                                          onChangeValue={(val) => handleKitItemChange(kIdx, val)}
                                          precision={2}
                                          className="w-36 text-right text-xs"
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </Fragment>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-primary/5 font-semibold border-t">
                          <td className="p-3 text-right text-muted-foreground" colSpan={2}>
                            Subtotal Base (Pré-Desconto):
                          </td>
                          <td className="p-3 text-right text-foreground font-bold tabular-nums">
                            {brl2(baseSubtotal)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}
            </div>

            {/* Bloco 2: Configuração de Desconto / Valor Final Direto */}
            <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-foreground">
                    Ajuste de Preço de Venda
                  </h4>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      Escolha entre definir o percentual de desconto ou o valor final em reais. Em
                      ambos os casos a margem absorve o ajuste e os custos percentuais são
                      recalculados.
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
                      Máx. permitido: {pct2(maxDiscount)}%
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
                    Desconto de {pct2(effectiveDiscountPercent)}% excede o limite máximo permitido
                    para seu usuário ({pct2(maxDiscount)}%).
                  </span>
                </div>
              )}
            </div>

            {/* Bloco 3: Custos e Margem Recalculados Após o Desconto (Recolhível) */}
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
                  <span>Após o Desconto (Custos e Margem Recalculados)</span>
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
                  {activeRecalc ? (
                    <>
                      {/* Tabela resumida de custos recalculados */}
                      {activeRecalc.detail && activeRecalc.detail.length > 0 && (
                        <div className="border rounded-md overflow-hidden text-xs">
                          <table className="w-full">
                            <thead className="bg-muted/40 border-b text-muted-foreground">
                              <tr>
                                <th className="text-left p-2.5 font-medium">Item Recalculado</th>
                                <th className="text-left p-2.5 font-medium">Base de Incidência</th>
                                <th className="text-right p-2.5 font-medium w-36">
                                  Novo Valor (R$)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeRecalc.detail.map((item, idx) => (
                                <tr
                                  key={`recalc-detail-${idx}`}
                                  className="border-b last:border-0 hover:bg-muted/10"
                                >
                                  <td className="p-2.5 font-medium text-foreground">{item.name}</td>
                                  <td className="p-2.5 text-muted-foreground">{item.label}</td>
                                  <td className="p-2.5 text-right tabular-nums text-foreground">
                                    {brl2(item.amount)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Quadro consolidado de impacto financeiro */}
                      <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-lg space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-amber-800">Venda Base (Pré-Desconto):</span>
                          <span className="font-semibold text-amber-950 tabular-nums">
                            {brl2(activeRecalc.baseTotal)}
                          </span>
                        </div>
                        {activeRecalc.discountValue > 0 && (
                          <div className="flex justify-between">
                            <span className="text-amber-800">
                              Desconto Aplicado ({pct2(activeRecalc.discountPercent)}%):
                            </span>
                            <span className="font-semibold text-destructive tabular-nums">
                              - {brl2(activeRecalc.discountValue)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-amber-800">
                            Total de Custos (Fixos + Percentuais Recalc.):
                          </span>
                          <span className="font-semibold text-destructive tabular-nums">
                            - {brl2(activeRecalc.costsTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-amber-200 text-sm font-bold">
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
                    </>
                  ) : (
                    <div className="p-4 bg-muted/30 rounded-lg text-center text-xs text-muted-foreground">
                      Custos pré e pós-desconto são idênticos sem desconto ou custos percentuais
                      aplicados.
                    </div>
                  )}

                  {/* Resumo de Fechamento */}
                  <div className="bg-muted/40 p-3.5 rounded-lg border space-y-1.5 text-sm">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Subtotal Base:</span>
                      <span className="tabular-nums font-medium text-foreground">
                        {brl2(baseSubtotal)}
                      </span>
                    </div>
                    {effectiveDiscountValue > 0 && (
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
              )}
            </div>
          </div>
        </TooltipProvider>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || costs.length === 0 || discountExceeded}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
