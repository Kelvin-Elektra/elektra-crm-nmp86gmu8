import { useState, useEffect } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { useKitCalculator } from '@/hooks/use-kit-calculator'

export function ProposalCostModal({ open, onOpenChange, proposal, reload, neg }: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [costs, setCosts] = useState<any[]>([])
  const [negData, setNegData] = useState<any>(neg)

  useEffect(() => {
    if (open && proposal?.negotiation_id && !neg) {
      pb.collection('negotiations')
        .getOne(proposal.negotiation_id)
        .then(setNegData)
        .catch(console.error)
    } else if (neg) {
      setNegData(neg)
    }
  }, [open, proposal, neg])

  const [snapshotPricing, setSnapshotPricing] = useState<any>(null)

  useEffect(() => {
    if (proposal?.snapshot_data?.pricing) {
      setSnapshotPricing(proposal.snapshot_data.pricing)
    } else {
      setSnapshotPricing(null)
    }
  }, [proposal])

  const calcResult = useKitCalculator(negData)

  const kitPrice = snapshotPricing ? snapshotPricing.kitPrice : calcResult.kitPrice
  const kitComposition = snapshotPricing?.kitComposition
    ? snapshotPricing.kitComposition
    : calcResult.kitComposition
  const calcLoading = snapshotPricing ? false : calcResult.loading
  const isManualMode = snapshotPricing?.pricingMode === 'manual'

  useEffect(() => {
    if (open && proposal) {
      let data = proposal.cost_breakdown || []
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch (e) {
          data = []
        }
      }
      setCosts(data)
    }
  }, [open, proposal])

  const handleUpdate = (idx: number, field: string, val: string) => {
    const arr = [...costs]
    arr[idx][field] = Number(val)
    if (field === 'cost' || field === 'margin') {
      arr[idx].price = arr[idx].cost * (1 + arr[idx].margin / 100)
    }
    setCosts(arr)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const newPrice = costs.reduce((acc, c) => acc + (c.price || 0), 0)
      await pb.collection('proposals').update(proposal.id, {
        cost_breakdown: costs,
        price: newPrice,
        total_value: newPrice,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custos da Proposta #{proposal?.id}</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              Visualize e edite os custos específicos desta proposta.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <h3 className="font-semibold text-lg mb-2">Composição e Detalhamento de Custos</h3>

          {costs.length === 0 ? (
            <p className="text-muted-foreground text-center p-6 border rounded-lg bg-muted/20">
              Nenhum detalhamento de custo salvo para esta proposta.
            </p>
          ) : (
            <div className="space-y-6">
              {costs.map((b, idx) => {
                const isKit =
                  b.name === 'Kit Fotovoltaico' ||
                  b.name === 'Kit Fotovoltaico (Equipamentos e Insumos)' ||
                  b.type === 'kit'

                if (isKit) {
                  return (
                    <Accordion type="single" collapsible className="w-full" key={idx}>
                      <AccordionItem value="kit" className="border rounded-lg bg-card shadow-sm">
                        <AccordionTrigger className="hover:no-underline px-5 py-4">
                          <div className="flex items-center justify-between w-full pr-4">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-base">
                                {b.name === 'Kit Fotovoltaico'
                                  ? 'Kit Fotovoltaico (Equipamentos e Insumos)'
                                  : b.name}
                              </span>
                              {isManualMode && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-yellow-50 text-yellow-800 border-yellow-200"
                                >
                                  Modo Manual
                                </Badge>
                              )}
                            </div>
                            <span className="font-bold text-primary text-lg">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(b.price || 0)}
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-0 pb-5 px-5">
                          <div className="flex gap-4 items-end mb-6 border-b pb-6">
                            <div className="w-1/3">
                              <Label>Custo Base (R$)</Label>
                              <Input
                                type="number"
                                value={b.cost}
                                onChange={(e) => handleUpdate(idx, 'cost', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div className="w-1/3">
                              <Label>Margem (%)</Label>
                              <Input
                                type="number"
                                value={b.margin}
                                onChange={(e) => handleUpdate(idx, 'margin', e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div className="w-1/3">
                              <Label>Preço Calculado (R$)</Label>
                              <Input
                                type="number"
                                value={b.price?.toFixed(2)}
                                readOnly
                                className="bg-muted mt-1 font-medium"
                              />
                            </div>
                          </div>

                          <h4 className="font-medium text-sm mb-3 text-muted-foreground">
                            {isManualMode
                              ? 'Itens Considerados no Dimensionamento Técnico:'
                              : 'Itens Inclusos no Kit:'}
                          </h4>
                          {calcLoading ? (
                            <div className="flex justify-center p-4 text-muted-foreground animate-pulse bg-muted/20 rounded-md">
                              Carregando composição...
                            </div>
                          ) : kitComposition.filter((i: any) => i.qty > 0).length === 0 ? (
                            <p className="text-muted-foreground text-sm text-center p-4 bg-muted/20 rounded-md">
                              Nenhum equipamento ou insumo válido definido.
                            </p>
                          ) : (
                            <div className="border rounded-md overflow-hidden bg-background">
                              <table className="w-full text-sm">
                                <thead className="bg-muted/50 border-b">
                                  <tr>
                                    <th className="text-left p-3 font-medium">
                                      Equipamento/Insumo
                                    </th>
                                    <th className="text-center p-3 font-medium">Tipo</th>
                                    <th className="text-right p-3 font-medium">Qtd</th>
                                    <th className="text-right p-3 font-medium">Custo Estimado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {kitComposition
                                    .filter((item: any) => item.qty > 0)
                                    .map((item: any, itemIdx: number) => (
                                      <tr
                                        key={itemIdx}
                                        className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                                      >
                                        <td className="p-3">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">{item.name}</span>
                                            {item.ruleApplied && (
                                              <Badge
                                                variant="secondary"
                                                className="text-[10px] h-5 px-1.5 font-normal"
                                              >
                                                Regra Aplicada
                                              </Badge>
                                            )}
                                          </div>
                                        </td>
                                        <td className="p-3 text-center text-muted-foreground capitalize">
                                          {item.type === 'supply'
                                            ? 'Insumo'
                                            : item.type === 'module'
                                              ? 'Módulo'
                                              : 'Inversor'}
                                        </td>
                                        <td className="p-3 text-right tabular-nums">
                                          {item.qty.toLocaleString('pt-BR', {
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td className="p-3 text-right font-medium tabular-nums text-muted-foreground">
                                          {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                          }).format(item.total)}
                                        </td>
                                      </tr>
                                    ))}
                                  <tr className="bg-muted/30 font-semibold text-sm border-t-2">
                                    <td colSpan={3} className="p-3 text-right">
                                      {isManualMode
                                        ? 'Valor Base Manual Informado:'
                                        : 'Soma Estimada do Kit:'}
                                    </td>
                                    <td className="p-3 text-right text-foreground tabular-nums">
                                      {new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                      }).format(kitPrice)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )
                }

                return (
                  <div
                    key={idx}
                    className="flex gap-4 items-end border-b pb-4 last:border-0 bg-card p-4 rounded-lg border shadow-sm"
                  >
                    <div className="flex-1">
                      <Label className="text-muted-foreground text-xs">Item Adicional</Label>
                      <p className="font-medium mt-1 truncate text-base" title={b.name}>
                        {b.name}
                      </p>
                    </div>
                    <div className="w-28">
                      <Label>Custo (R$)</Label>
                      <Input
                        type="number"
                        value={b.cost}
                        onChange={(e) => handleUpdate(idx, 'cost', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="w-24">
                      <Label>Margem (%)</Label>
                      <Input
                        type="number"
                        value={b.margin}
                        onChange={(e) => handleUpdate(idx, 'margin', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="w-32">
                      <Label>Preço (R$)</Label>
                      <Input
                        type="number"
                        value={b.price?.toFixed(2)}
                        readOnly
                        className="bg-muted mt-1 font-medium text-primary"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {snapshotPricing?.appliedCosts && snapshotPricing.appliedCosts.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h3 className="font-semibold text-sm">Detalhamento de Custos Variáveis e Aplicados</h3>
            <div className="space-y-1">
              {snapshotPricing.appliedCosts.map((cost: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm py-1">
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
          </div>
        )}
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
