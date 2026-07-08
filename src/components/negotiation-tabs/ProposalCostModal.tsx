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
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Package } from 'lucide-react'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

interface CostItem {
  name: string
  method: string
  percentage: string
  value: number
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

  const isAdmin =
    user?.role === 'User_elektra' || user?.role_company === 'admin' || user?.role === 'User_owner'

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
      const kitComposition = pricing.kitComposition || []
      const kitPrice = pricing.kitPrice || 0

      let costItems: CostItem[] = []

      if (appliedCosts.length > 0) {
        costItems.push({
          name: 'Kit Fotovoltaico (Equipamentos e Insumos)',
          method: 'kit',
          percentage: '—',
          value: kitPrice,
        })
        appliedCosts.forEach((c: any) => {
          const isPercent = ['rate', 'tax', 'margin', 'kit_percent'].includes(c.method)
          costItems.push({
            name: c.name,
            method: c.method,
            percentage: isPercent ? `${c.value}%` : '—',
            value: c.calculatedAmount || c.amount || 0,
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
    }
  }, [open, proposal])

  const kitTotal = useMemo(
    () => kitItems.reduce((acc, item) => acc + (Number(item.total) || 0), 0),
    [kitItems],
  )

  const hasKitItems = kitItems.length > 0

  const total = useMemo(() => {
    return costs.reduce((acc, c) => {
      if (c.method === 'kit' && hasKitItems) return acc + kitTotal
      return acc + (Number(c.value) || 0)
    }, 0)
  }, [costs, kitTotal, hasKitItems])

  const handleCostChange = (idx: number, val: string) => {
    const arr = [...costs]
    arr[idx].value = Number(val) || 0
    setCosts(arr)
  }

  const handleKitItemChange = (idx: number, val: string) => {
    const arr = [...kitItems]
    arr[idx].total = Number(val) || 0
    setKitItems(arr)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const discountAmount = proposal?.discount_amount || 0
      const newSubtotal = total
      const newFinal = newSubtotal * (1 - discountAmount / 100)

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
      }

      await pb.collection('proposals').update(proposal.id, {
        cost_breakdown,
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
              {BRL.format(proposal?.total_value || proposal?.price || 0)}
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
          <DialogTitle>Custos da Proposta</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              Visualize e edite os custos específicos desta proposta.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {costs.length === 0 ? (
            <p className="text-muted-foreground text-center p-6 border rounded-lg bg-muted/20">
              Nenhum detalhamento de custo salvo para esta proposta.
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Descrição</th>
                    <th className="text-center p-3 font-medium w-28">Percentual (%)</th>
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
                                className="flex items-center gap-1 font-medium"
                                onClick={() => setExpandedKit(!expandedKit)}
                              >
                                {expandedKit ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                                <Package className="w-4 h-4 text-primary" />
                                {c.name}
                              </button>
                            ) : (
                              <span className="font-medium">{c.name}</span>
                            )}
                          </td>
                          <td className="p-3 text-center text-muted-foreground">{c.percentage}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-muted-foreground text-sm">R$</span>
                              <Input
                                type="number"
                                value={
                                  kitReadOnly ? kitTotal.toFixed(2) : c.value?.toFixed(2) || '0.00'
                                }
                                onChange={(e) => handleCostChange(idx, e.target.value)}
                                readOnly={kitReadOnly}
                                className={cn(
                                  'w-32 text-right font-medium',
                                  kitReadOnly && 'bg-muted cursor-not-allowed',
                                )}
                              />
                            </div>
                          </td>
                        </tr>
                        {isKit &&
                          expandedKit &&
                          hasKitItems &&
                          kitItems.map((item, kIdx) => (
                            <tr key={`kit-${kIdx}`} className="bg-muted/10 border-b last:border-0">
                              <td className="p-3 pl-10 text-muted-foreground">
                                <span className="text-sm">{item.name}</span>
                                <span className="ml-2 text-xs text-muted-foreground/60">
                                  ({item.qty?.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                                  x)
                                </span>
                              </td>
                              <td className="p-3 text-center text-muted-foreground/40">—</td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-muted-foreground text-xs">R$</span>
                                  <Input
                                    type="number"
                                    value={item.total?.toFixed(2) || '0.00'}
                                    onChange={(e) => handleKitItemChange(kIdx, e.target.value)}
                                    className="w-32 text-right text-sm"
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
                  <tr className="bg-primary/5 font-semibold border-t-2">
                    <td className="p-3 text-right" colSpan={2}>
                      Total:
                    </td>
                    <td className="p-3 text-right text-primary text-lg tabular-nums">
                      {BRL.format(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {proposal?.discount_amount > 0 && (
            <>
              <div className="bg-muted/30 p-3 rounded-lg flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Desconto aplicado ({proposal.discount_amount}%):
                </span>
                <span className="font-medium text-destructive">
                  - {BRL.format((total * proposal.discount_amount) / 100)}
                </span>
              </div>
              <div className="bg-primary/5 p-3 rounded-lg flex justify-between text-sm font-semibold">
                <span>Total com desconto:</span>
                <span className="text-primary">
                  {BRL.format(total * (1 - (proposal.discount_amount || 0) / 100))}
                </span>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || costs.length === 0}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
