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

export function AdminCostsModal({ open, onOpenChange, negId }: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [budgets, setBudgets] = useState<any[]>([])

  useEffect(() => {
    if (open && negId) {
      pb.collection('budgets')
        .getFullList({ filter: `negotiation_id='${negId}'` })
        .then(setBudgets)
        .catch(() => toast({ variant: 'destructive', title: 'Erro ao carregar custos' }))
    }
  }, [open, negId])

  const handleUpdate = (idx: number, field: string, val: string) => {
    const arr = [...budgets]
    arr[idx][field] = Number(val)
    if (field === 'cost' || field === 'margin') {
      arr[idx].price = arr[idx].cost * (1 + arr[idx].margin / 100)
    }
    setBudgets(arr)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await Promise.all(
        budgets.map((b) =>
          pb.collection('budgets').update(b.id, {
            cost: b.cost,
            margin: b.margin,
            price: b.price,
          }),
        ),
      )
      toast({ title: 'Custos atualizados com sucesso' })
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
          <DialogTitle>Gerenciamento de Custos (Admin)</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              Gerencie os orçamentos e custos vinculados a esta negociação.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {budgets.length === 0 ? (
            <p className="text-muted-foreground text-center p-6 border rounded-lg bg-muted/20">
              Nenhum custo registrado para esta negociação.
            </p>
          ) : (
            <div className="space-y-4">
              {budgets.map((b, idx) => (
                <div key={b.id} className="flex gap-4 items-end border-b pb-4 last:border-0">
                  <div className="flex-1">
                    <Label className="text-muted-foreground text-xs">Item</Label>
                    <p className="font-medium mt-1">{b.name}</p>
                  </div>
                  <div className="w-24">
                    <Label>Custo (R$)</Label>
                    <Input
                      type="number"
                      value={b.cost}
                      onChange={(e) => handleUpdate(idx, 'cost', e.target.value)}
                    />
                  </div>
                  <div className="w-56">
                    <Label>Margem real (% sobre o valor da venda)</Label>
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
          <Button onClick={handleSave} disabled={loading || budgets.length === 0}>
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
