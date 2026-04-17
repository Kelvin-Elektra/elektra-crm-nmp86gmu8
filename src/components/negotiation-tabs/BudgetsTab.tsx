import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Plus } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'

export function BudgetsTab({ neg }: { neg: any }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', type: 'product', cost: '', margin: '' })

  const loadItems = async () => {
    try {
      const res = await pb
        .collection('budgets')
        .getFullList({ filter: `negotiation_id = '${neg.id}'` })
      setItems(res)
    } catch (e) {}
  }

  useEffect(() => {
    loadItems()
  }, [neg.id])
  useRealtime('budgets', () => loadItems())

  const handleAdd = async () => {
    if (!formData.name || !formData.cost || !formData.margin) return
    setLoading(true)
    try {
      const cost = Number(formData.cost)
      const margin = Number(formData.margin)
      const price = cost * (1 + margin / 100)

      await pb.collection('budgets').create({
        company_id: user?.company_id,
        negotiation_id: neg.id,
        name: formData.name,
        type: formData.type,
        cost,
        margin,
        price,
      })
      setFormData({ name: '', type: 'product', cost: '', margin: '' })
      toast({ title: 'Adicionado com sucesso' })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar' })
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (id: string) => {
    try {
      await pb.collection('budgets').delete(id)
      toast({ title: 'Item removido' })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao remover' })
    }
  }

  const formatBRL = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Adicionar Item ao Orçamento</CardTitle>
          <CardDescription>
            Produtos e serviços avulsos (ex: câmeras, padrões de entrada).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-end gap-4">
          <div className="space-y-2 flex-1 w-full">
            <Label>Nome do Item</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2 w-full md:w-32">
            <Label>Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(v) => setFormData((p) => ({ ...p, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="product">Produto</SelectItem>
                <SelectItem value="service">Serviço</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 w-full md:w-32">
            <Label>Custo (R$)</Label>
            <Input
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData((p) => ({ ...p, cost: e.target.value }))}
            />
          </div>
          <div className="space-y-2 w-full md:w-24">
            <Label>Margem (%)</Label>
            <Input
              type="number"
              value={formData.margin}
              onChange={(e) => setFormData((p) => ({ ...p, margin: e.target.value }))}
            />
          </div>
          <Button onClick={handleAdd} disabled={loading} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Adicionar
          </Button>
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {item.type === 'product' ? 'Produto' : 'Serviço'}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 self-end sm:self-auto">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Custo: {formatBRL(item.cost)}</p>
                      <p className="font-bold text-primary">{formatBRL(item.price)}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-muted/50 font-bold text-right flex justify-end gap-4 rounded-b-xl border-t">
              <span>Total do Orçamento:</span>
              <span className="text-primary">
                {formatBRL(items.reduce((acc, i) => acc + i.price, 0))}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
