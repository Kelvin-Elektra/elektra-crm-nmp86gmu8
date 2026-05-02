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

export function ProposalCostModal({ open, onOpenChange, proposal, reload }: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [costs, setCosts] = useState<any[]>([])

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
