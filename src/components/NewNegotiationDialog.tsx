import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import pb from '@/lib/pocketbase/client'
import { ScrollArea } from '@/components/ui/scroll-area'
import { maskCEP } from '@/lib/masks'

export function NewNegotiationDialog({ open, onOpenChange, onSuccess, initialLeadId }: any) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [leads, setLeads] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [utilities, setUtilities] = useState<any[]>([])
  const [tariffRules, setTariffRules] = useState<any[]>([])

  const [formData, setFormData] = useState({
    title: '',
    lead_id: initialLeadId || '',
    cep: '',
    address: '',
    number: '',
    city: '',
    state: '',
    utility_id: '',
    network_type: '',
    tension: '',
    uc: '',
    avg_consumption: '',
  })

  useEffect(() => {
    if (open) {
      getLeads().then(setLeads)
      getPipelineStages().then(setStages)
      if (user?.company_id) {
        pb.collection('pv_utilities')
          .getFullList({ filter: `company_id='${user.company_id}'` })
          .then(setUtilities)
        pb.collection('pv_tariff_rules')
          .getFullList({ filter: `company_id='${user.company_id}'` })
          .then(setTariffRules)
      }
      if (initialLeadId) setFormData((prev) => ({ ...prev, lead_id: initialLeadId }))
      else setFormData((prev) => ({ ...prev, lead_id: '' }))
    }
  }, [open, initialLeadId, user?.company_id])

  useEffect(() => {
    const cep = formData.cep.replace(/\D/g, '')
    if (cep.length === 8) {
      fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.erro) {
            setFormData((prev) => ({
              ...prev,
              address: prev.address || data.logradouro,
              city: prev.city || data.localidade,
              state: prev.state || data.uf,
            }))
          }
        })
        .catch(console.error)
    }
  }, [formData.cep])

  const availableVoltages = formData.utility_id
    ? Array.from(
        new Set(
          tariffRules
            .filter(
              (r) =>
                r.utility_id === formData.utility_id &&
                (!formData.network_type || r.network_type === formData.network_type),
            )
            .map((r) => r.voltage)
            .filter(Boolean),
        ),
      )
    : []
  const voltageOptions =
    availableVoltages.length > 0
      ? availableVoltages
      : ['127/220V', '220/380V', '127/254V', '220/440V']

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const firstStage = stages.sort((a, b) => a.order - b.order)[0]
      if (!firstStage) throw new Error('Nenhum estágio configurado no funil.')

      const utilityName = utilities.find((u) => u.id === formData.utility_id)?.name || ''
      const fullAddress = `${formData.address}, ${formData.number} - ${formData.city} - ${formData.state}, ${formData.cep}`

      const neg = await createNegotiation({
        company_id: user?.company_id,
        lead_id: formData.lead_id,
        title: formData.title,
        stage: firstStage.id,
        concessionaire: utilityName,
        utility_id: formData.utility_id,
        cep: formData.cep,
        city: formData.city,
        state: formData.state,
        address: fullAddress,
        uc: formData.uc,
        avg_consumption: Number(formData.avg_consumption) || 0,
        owner_id: user?.id,
        tags: [],
        sizing: {
          tension: formData.tension,
          network_type: formData.network_type,
          address_struct: {
            street: formData.address,
            number: formData.number,
            city: formData.city,
            state: formData.state,
            zip: formData.cep,
          },
        },
      })
      toast({ title: 'Sucesso', description: 'Negociação criada com sucesso!' })
      onSuccess?.()
      onOpenChange(false)
      navigate(`/negociacoes/${neg.id}`)
      setFormData({
        title: '',
        lead_id: '',
        cep: '',
        address: '',
        number: '',
        city: '',
        state: '',
        utility_id: '',
        network_type: '',
        tension: '',
        uc: '',
        avg_consumption: '',
      })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message || 'Erro ao criar' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Nova Negociação</DialogTitle>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6">
          <form onSubmit={onSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Título (Identificador)</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Sistema 5kWp Sr. João"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Lead / Cliente</Label>
                <Select
                  value={formData.lead_id}
                  onValueChange={(val) => setFormData({ ...formData, lead_id: val })}
                  required
                  disabled={!!initialLeadId}
                >
                  <SelectTrigger className={initialLeadId ? 'opacity-50 cursor-not-allowed' : ''}>
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

              {/* Endereço - Form Order 1-5 */}
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                  maxLength={9}
                />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Rua / Av</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Número / Complemento</Label>
                <Input
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado (UF)</Label>
                <Input
                  value={formData.state}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value.toUpperCase() })
                  }
                  maxLength={2}
                />
              </div>

              {/* Concessionária & Tensão */}
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Concessionária</Label>
                <Select
                  value={formData.utility_id}
                  onValueChange={(val) => setFormData({ ...formData, utility_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {utilities.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Tipo de Rede</Label>
                <Select
                  value={formData.network_type}
                  onValueChange={(val) => setFormData({ ...formData, network_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monofásico">Monofásico</SelectItem>
                    <SelectItem value="Bifásico">Bifásico</SelectItem>
                    <SelectItem value="Trifásico">Trifásico</SelectItem>
                    <SelectItem value="Monofásico rural">Monofásico rural</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tensão da Instalação</Label>
                <Select
                  value={formData.tension}
                  onValueChange={(val) => setFormData({ ...formData, tension: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {voltageOptions.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>UC</Label>
                <Input
                  value={formData.uc}
                  onChange={(e) => setFormData({ ...formData, uc: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Consumo Médio (kWh)</Label>
                <Input
                  type="number"
                  value={formData.avg_consumption}
                  onChange={(e) => setFormData({ ...formData, avg_consumption: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit">Criar Negociação</Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
