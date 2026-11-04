import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

interface MemberLike {
  id: string
  name?: string
  email?: string
  max_discount?: number
}

interface UserDiscountConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: MemberLike | null
  onSaved?: () => void
}

/**
 * Configuração comercial do usuário (não edita cadastro — a gestão de
 * cadastro continua no HUB). A coluna `max_discount` já existe na collection
 * `users` (0 a 100) e é a fonte usada pela validação de desconto das
 * propostas; novos campos de configuração podem ser adicionados como colunas
 * simples na mesma collection.
 */
export function UserDiscountConfigModal({
  open,
  onOpenChange,
  member,
  onSaved,
}: UserDiscountConfigModalProps) {
  const { toast } = useToast()
  const [maxDiscount, setMaxDiscount] = useState<string>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && member) {
      const current = Number((member as any).max_discount ?? 0)
      setMaxDiscount(current > 0 ? String(current) : '')
    }
  }, [open, member])

  const handleSave = async () => {
    if (!member) return
    const parsed = Number(maxDiscount === '' ? 0 : maxDiscount)
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast({
        variant: 'destructive',
        title: 'Valor inválido',
        description: 'Informe um desconto máximo entre 0 e 100.',
      })
      return
    }

    setSaving(true)
    try {
      await pb.collection('users').update(member.id, { max_discount: parsed })
      toast({
        title: 'Configuração salva',
        description: `Desconto máximo de ${parsed}% para ${member.name || member.email || 'usuário'}.`,
      })
      onSaved?.()
      onOpenChange(false)
    } catch (err: any) {
      const errors = extractFieldErrors(err)
      const msg =
        Object.keys(errors).length > 0
          ? Object.values(errors).join(' ')
          : err?.message || 'Não foi possível salvar a configuração do usuário.'
      toast({ variant: 'destructive', title: 'Erro', description: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configuração do usuário</DialogTitle>
          <DialogDescription>
            Permissões comerciais de {member?.name || member?.email || 'usuário'}. O cadastro
            continua gerenciado pelo Elektra HUB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="user-max-discount">Desconto máximo permitido (%)</Label>
          <Input
            id="user-max-discount"
            type="number"
            min={0}
            max={100}
            step="1"
            value={maxDiscount}
            onChange={(e) => setMaxDiscount(e.target.value)}
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">
            Limite de desconto que este usuário pode aplicar em orçamentos e propostas.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
