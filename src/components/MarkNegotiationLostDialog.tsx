import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertCircle } from 'lucide-react'

export const DEFAULT_LOSS_REASONS = [
  'Preço elevado / fora do orçamento',
  'Fechou com concorrente',
  'Desistiu do projeto fotovoltaico',
  'Sem capital / Financiamento reprovado',
  'Incompatibilidade técnica do telhado/imóvel',
  'Adiamento da decisão para o próximo semestre',
  'Cliente não responde / perdeu contato',
  'Outro motivo',
]

interface MarkNegotiationLostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  negotiationTitle?: string
  onConfirm: (reason: string, notes: string) => Promise<void>
}

export function MarkNegotiationLostDialog({
  open,
  onOpenChange,
  negotiationTitle,
  onConfirm,
}: MarkNegotiationLostDialogProps) {
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClose = () => {
    if (submitting) return
    setReason('')
    setNotes('')
    setError(null)
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (!reason || reason.trim() === '') {
      setError('Por favor, selecione o motivo da perda.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await onConfirm(reason, notes)
      handleClose()
    } catch (err: any) {
      setError(err?.message || 'Falha ao registrar motivo de perda.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertCircle className="w-5 h-5" />
            Marcar Negociação como Perdida
          </DialogTitle>
          <DialogDescription>
            {negotiationTitle ? (
              <span>
                Para mover <strong>{negotiationTitle}</strong> para perda, informe o motivo. Esta
                negociação ficará oculta do funil principal para manter sua visão de vendas limpa.
              </span>
            ) : (
              'Informe o motivo pelo qual esta negociação foi perdida.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-md border border-rose-200">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="loss-reason">
              Motivo da Perda <span className="text-destructive">*</span>
            </Label>
            <Select
              value={reason}
              onValueChange={(val) => {
                setReason(val)
                setError(null)
              }}
            >
              <SelectTrigger id="loss-reason">
                <SelectValue placeholder="Selecione o principal motivo..." />
              </SelectTrigger>
              <SelectContent>
                {DEFAULT_LOSS_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="loss-notes">Observações adicionais (opcional)</Label>
            <Textarea
              id="loss-notes"
              placeholder="Descreva detalhes que ajudam a entender o que faltou ou lições para o time comercial..."
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {submitting ? 'Salvando...' : 'Confirmar Perda'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
