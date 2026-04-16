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

  const applyPhoneMask = (val: string) => {
    let v = val.replace(/\D/g, '')
    if (v.length > 11) v = v.slice(0, 11)
    if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`
    if (v.length > 10) v = `${v.slice(0, 10)}-${v.slice(10)}`
    return v
  }

  const applyDocumentMask = (val: string) => {
    let v = val.replace(/\D/g, '')
    if (v.length <= 11) {
      v = v.replace(/(\d{3})(\d)/, '$1.$2')
      v = v.replace(/(\d{3})(\d)/, '$1.$2')
      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    } else {
      if (v.length > 14) v = v.slice(0, 14)
      v = v.replace(/(\d{2})(\d)/, '$1.$2')
      v = v.replace(/(\d{3})(\d)/, '$1.$2')
      v = v.replace(/(\d{3})(\d)/, '$1/$2')
      v = v.replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    }
    return v
  }

  useEffect(() => {
    if (lead)
      setFormData({
        name: lead.name,
        document: applyDocumentMask(lead.document || ''),
        email: lead.email || '',
        phone: applyPhoneMask(lead.phone || ''),
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
        if (fieldErrors.phone?.toLowerCase().includes('unique')) {
          toast({
            variant: 'destructive',
            title: 'Erro de Unicidade',
            description: 'Este telefone já está cadastrado em outro lead desta empresa.',
          })
          setErrors((prev) => ({ ...prev, phone: 'Este telefone já está cadastrado.' }))
        }
      } else if (err.message?.toLowerCase().includes('unique constraint failed')) {
        toast({
          variant: 'destructive',
          title: 'Erro de Unicidade',
          description: 'Este telefone já está cadastrado em outro lead desta empresa.',
        })
        setErrors({ phone: 'Este telefone já está cadastrado.' })
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
              placeholder="Ex: João da Silva"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Telefone (Obrigatório)</Label>
            <Input
              required
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: applyPhoneMask(e.target.value) })}
            />
            {errors.phone && <span className="text-xs text-destructive">{errors.phone}</span>}
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Documento (CPF/CNPJ)</Label>
            <Input
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              value={formData.document}
              onChange={(e) =>
                setFormData({ ...formData, document: applyDocumentMask(e.target.value) })
              }
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
