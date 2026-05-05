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
        <div className="space-y-4 py-4">
          <Accordion type="single" collapsible className="w-full mb-6">
            <AccordionItem value="kit">
              <AccordionTrigger className="hover:no-underline px-4 py-3 bg-muted/30 rounded-lg border">
                <span className="font-semibold text-base">
                  Kit Fotovoltaico (Equipamentos e Insumos)
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-2 px-2">
                {calcLoading ? (
                  <div className="flex justify-center p-4 text-muted-foreground animate-pulse">
                    Carregando composição...
                  </div>
                ) : kitComposition.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center p-4">
                    Nenhum equipamento definido.
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="text-left p-3 font-medium">Equipamento/Insumo</th>
                          <th className="text-center p-3 font-medium">Tipo</th>
                          <th className="text-right p-3 font-medium">Qtd</th>
                          <th className="text-right p-3 font-medium">Custo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kitComposition.map((item: any, idx: number) => (
                          <tr key={idx} className="border-b last:border-0 hover:bg-muted/20">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.name}</span>
                                {item.ruleApplied && (
                                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                    Regra
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
                            <td className="p-3 text-right">
                              {item.qty.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(item.total)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-muted/10 font-bold text-base border-t-2">
                          <td colSpan={3} className="p-4 text-right">
                            Custo Estimado do Kit:
                          </td>
                          <td className="p-4 text-right text-primary">
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

          <h3 className="font-semibold text-base mb-2">Custos Adicionais e Orçamento</h3>
          {costs.length === 0 ? (
            <p className="text-muted-foreground text-center p-6 border rounded-lg bg-muted/20">
              Nenhum detalhamento de custo salvo para esta proposta.
            </p>
          ) : (
            <div className="space-y-4">
              {costs.map((b, idx) => (
                <div key={idx} className="flex gap-4 items-end border-b pb-4 last:border-0">
                  <div className="flex-1">
                    <Label className="text-muted-foreground text-xs">Item</Label>
                    <p className="font-medium mt-1 truncate" title={b.name}>
                      {b.name}
                    </p>
                  </div>
                  <div className="w-24">
                    <Label>Custo (R$)</Label>
                    <Input
                      type="number"
                      value={b.cost}
                      onChange={(e) => handleUpdate(idx, 'cost', e.target.value)}
                    />
                  </div>
                  <div className="w-24">
                    <Label>Margem (%)</Label>
                    <Input
                      type="number"
                      value={b.margin}
                      onChange={(e) => handleUpdate(idx, 'margin', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <Label>Preço (R$)</Label>
                    <Input
                      type="number"
                      value={b.price?.toFixed(2)}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
              ))}
            </div>
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
