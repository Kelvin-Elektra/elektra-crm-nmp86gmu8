import { useState, useMemo } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function ProposalEditModal({ open, onOpenChange, proposal, reload }: any) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

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

  const storedDiscount = proposal?.discount_amount || 0
  const storedTotal = proposal?.total_value || proposal?.price || 0
  const subtotal = storedDiscount > 0 ? storedTotal / (1 - storedDiscount / 100) : storedTotal

  const [discountPercent, setDiscountPercent] = useState(storedDiscount)
  const [paymentTerms, setPaymentTerms] = useState(proposal?.payment_terms || '')
  const [notes, setNotes] = useState(proposal?.notes || '')
  const [validityDate, setValidityDate] = useState(
    proposal?.validity_date ? new Date(proposal.validity_date).toISOString().split('T')[0] : '',
  )

  const discountValue = subtotal * (discountPercent / 100)
  const finalTotal = subtotal - discountValue

  const originalMarginAmount = subtotal * marginSum
  const adjustedMarginAmount = originalMarginAmount - discountValue
  const adjustedMarginPct = Math.max(0, marginSum * 100 - discountPercent)
  const maxDiscount = (user as any)?.max_discount || 0
  const discountExceeded = maxDiscount > 0 && discountPercent > maxDiscount

  const handleSave = async () => {
    if (discountExceeded) {
      return
    }

    setLoading(true)
    try {
      await pb.collection('proposals').update(proposal.id, {
        discount_amount: discountPercent,
        total_value: finalTotal,
        price: subtotal,
        payment_terms: paymentTerms,
        notes: notes,
        validity_date: validityDate ? new Date(validityDate).toISOString() : null,
      })
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
          <DialogTitle>Editar Proposta</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>
              Edite os termos financeiros e validade da proposta.
            </DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Desconto (%)</Label>
            <Input
              type="number"
              min="0"
              max={maxDiscount || undefined}
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Máx. permitido: {maxDiscount}%</p>
            {discountExceeded && (
              <p className="text-sm text-destructive font-medium">
                Desconto excede o limite permitido para o seu usuário.
              </p>
            )}
          </div>

          {isAdmin && marginSum > 0 && discountPercent > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-sm text-amber-900">Impacto na Margem Real</h4>
              <div className="flex justify-between text-sm">
                <span className="text-amber-700">Margem Original:</span>
                <span className="font-medium text-amber-900">
                  {BRL.format(originalMarginAmount)} ({(marginSum * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-700">Desconto Aplicado:</span>
                <span className="font-medium text-destructive">- {BRL.format(discountValue)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-1 border-t border-amber-200">
                <span className="text-amber-900">Margem Ajustada:</span>
                <span className="text-amber-700">
                  {BRL.format(adjustedMarginAmount)} ({adjustedMarginPct.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}

          <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{BRL.format(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Desconto ({discountPercent}%):</span>
              <span className="font-medium text-destructive">- {BRL.format(discountValue)}</span>
            </div>
            <div className="flex justify-between text-base font-bold pt-2 border-t">
              <span>Total Final:</span>
              <span className="text-primary">{BRL.format(finalTotal)}</span>
            </div>
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
