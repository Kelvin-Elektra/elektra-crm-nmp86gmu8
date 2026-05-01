import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'

export function ProposalEditModal({ open, onOpenChange, proposal, reload }: any) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    discount_amount: proposal?.discount_amount || 0,
    payment_terms: proposal?.payment_terms || '',
    notes: proposal?.notes || '',
    validity_date: proposal?.validity_date
      ? new Date(proposal.validity_date).toISOString().split('T')[0]
      : '',
  })

  const handleSave = async () => {
    const price = proposal?.price || 0
    const discountPercent = price > 0 ? (formData.discount_amount / price) * 100 : 0
    const maxDiscount = user?.max_discount || 0

    if (maxDiscount > 0 && discountPercent > maxDiscount) {
      toast({
        variant: 'destructive',
        title: 'Desconto não permitido',
        description: `O desconto máximo permitido para você é de ${maxDiscount}%. (Desconto atual: ${discountPercent.toFixed(1)}%)`,
      })
      return
    }

    setLoading(true)
    try {
      await pb.collection('proposals').update(proposal.id, formData)
      toast({ title: 'Proposta atualizada' })
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Termos da Proposta</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Desconto Aplicado (R$)</Label>
            <Input
              type="number"
              value={formData.discount_amount}
              onChange={(e) =>
                setFormData({ ...formData, discount_amount: Number(e.target.value) })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Data de Validade</Label>
            <Input
              type="date"
              value={formData.validity_date}
              onChange={(e) => setFormData({ ...formData, validity_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Condições de Pagamento</Label>
            <Textarea
              value={formData.payment_terms}
              onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
