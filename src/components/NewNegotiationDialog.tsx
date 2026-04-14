import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
import { createNegotiation, getLeads, getPipelineStages } from '@/services/db'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'

export function NewNegotiationDialog({ open, onOpenChange, onSuccess, initialLeadId }: any) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [leads, setLeads] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])

  const [formData, setFormData] = useState({
    title: '',
    lead_id: initialLeadId || '',
    concessionaire: '',
    uc: '',
    address: '',
    avg_consumption: '',
  })

  useEffect(() => {
    if (open) {
      getLeads().then(setLeads)
      getPipelineStages().then(setStages)
      if (initialLeadId) setFormData((prev) => ({ ...prev, lead_id: initialLeadId }))
      else setFormData((prev) => ({ ...prev, lead_id: '' }))
    }
  }, [open, initialLeadId])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const firstStage = stages.sort((a, b) => a.order - b.order)[0]
      if (!firstStage) throw new Error('Nenhum estágio configurado no funil.')

      await createNegotiation({
        company_id: user?.company_id,
        lead_id: formData.lead_id,
        title: formData.title,
        stage: firstStage.id,
        concessionaire: formData.concessionaire,
        uc: formData.uc,
        address: formData.address,
        avg_consumption: Number(formData.avg_consumption) || 0,
        tags: [],
      })
      toast({ title: 'Sucesso', description: 'Negociação criada com sucesso!' })
      onSuccess?.()
      onOpenChange(false)
      setFormData({
        title: '',
        lead_id: '',
        concessionaire: '',
        uc: '',
        address: '',
        avg_consumption: '',
      })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message || 'Erro ao criar' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Negociação</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Título (Identificador)</Label>
            <Input
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Sistema 5kWp Sr. João"
            />
          </div>
          <div className="space-y-2">
            <Label>Lead / Cliente</Label>
            <Select
              value={formData.lead_id}
              onValueChange={(val) => setFormData({ ...formData, lead_id: val })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um lead..." />
              </SelectTrigger>
              <SelectContent>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name} - {l.document || l.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Concessionária</Label>
              <Input
                value={formData.concessionaire}
                onChange={(e) => setFormData({ ...formData, concessionaire: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>UC</Label>
              <Input
                value={formData.uc}
                onChange={(e) => setFormData({ ...formData, uc: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Endereço de Instalação</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Consumo Médio (kWh)</Label>
            <Input
              type="number"
              value={formData.avg_consumption}
              onChange={(e) => setFormData({ ...formData, avg_consumption: e.target.value })}
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit">Criar Negociação</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
