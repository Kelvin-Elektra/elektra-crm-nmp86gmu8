import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createLead, updateLead } from '@/services/db'
import { useAuth } from '@/contexts/AuthContext'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'

export function LeadDialog({ open, onOpenChange, lead, onSuccess }: any) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [formData, setFormData] = useState({ name: '', document: '', email: '', phone: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (lead)
      setFormData({
        name: lead.name,
        document: lead.document || '',
        email: lead.email || '',
        phone: lead.phone || '',
      })
    else setFormData({ name: '', document: '', email: '', phone: '' })
    setErrors({})
  }, [lead, open])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      if (lead) await updateLead(lead.id, formData)
      else await createLead({ ...formData, company_id: user?.company_id })
      toast({ title: 'Sucesso', description: 'Lead salvo com sucesso!' })
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
        if (fieldErrors.phone?.includes('unique')) {
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Este telefone já está cadastrado em outro lead.',
          })
        }
      } else {
        toast({ variant: 'destructive', title: 'Erro', description: getErrorMessage(err) })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone (Obrigatório)</Label>
            <Input
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            {errors.phone && <span className="text-xs text-destructive">{errors.phone}</span>}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Documento (CPF/CNPJ)</Label>
            <Input
              value={formData.document}
              onChange={(e) => setFormData({ ...formData, document: e.target.value })}
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
