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
import { maskCEP } from '@/lib/masks'
import { LocationCombobox } from '@/components/LocationCombobox'
import { Search } from 'lucide-react'

const NETWORK_TYPES = ['Monofásico', 'Bifásico', 'Trifásico', 'Monofásico rural']

export function NewNegotiationDialog({ open, onOpenChange, onSuccess, initialLeadId }: any) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [leads, setLeads] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [utilities, setUtilities] = useState<any[]>([])
  const [tariffRules, setTariffRules] = useState<any[]>([])
  const [citiesForState, setCitiesForState] = useState<{ id: string; city: string }[]>([])
  const [isSearchingCep, setIsSearchingCep] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    lead_id: initialLeadId || '',
    cep: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    city_id: '',
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

  const searchCep = async () => {
    const cepStr = formData.cep.replace(/\D/g, '')
    if (cepStr.length !== 8) {
      toast({ title: 'Atenção', description: 'CEP deve ter 8 dígitos.', variant: 'destructive' })
      return
    }

    setIsSearchingCep(true)
    try {
      try {
        const cached = await pb.collection('cep_cache').getFirstListItem(`cep='${cepStr}'`)
        let cityName = ''
        if (cached.city_id) {
          const hsp = await pb.collection('pv_hsp_data').getOne(cached.city_id)
          cityName = hsp.city
        }
        setFormData((prev) => ({
          ...prev,
          address: cached.street || '',
          neighborhood: cached.neighborhood || '',
          state: cached.state || '',
          city_id: cached.city_id || '',
          city: cityName,
        }))
        setIsSearchingCep(false)
        return
      } catch {
        /* intentionally ignored */
      }

      const res = await fetch(`https://viacep.com.br/ws/${cepStr}/json/`)
      const data = await res.json()
      if (!data.erro) {
        const uf = data.uf || ''
        const cityName = data.localidade || ''
        let matchedId = ''

        if (uf && cityName) {
          try {
            const match = await pb
              .collection('pv_hsp_data')
              .getFirstListItem(`state='${uf}' && city~'${cityName}'`)
            if (match) matchedId = match.id
          } catch {
            /* intentionally ignored */
          }
        }

        setFormData((prev) => ({
          ...prev,
          address: data.logradouro || '',
          neighborhood: data.bairro || '',
          state: uf,
          city: matchedId ? cityName : '',
          city_id: matchedId,
        }))

        if (matchedId) {
          try {
            await pb.collection('cep_cache').create({
              cep: cepStr,
              city_id: matchedId,
              state: uf,
              neighborhood: data.bairro || '',
              street: data.logradouro || '',
            })
          } catch {
            /* intentionally ignored */
          }
        }
      } else {
        toast({ title: 'Erro', description: 'CEP não encontrado.', variant: 'destructive' })
      }
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao buscar CEP.', variant: 'destructive' })
    } finally {
      setIsSearchingCep(false)
    }
  }

  useEffect(() => {
    if (formData.state) {
      pb.collection('pv_hsp_data')
        .getFullList({ filter: `state='${formData.state}'`, sort: 'city' })
        .then((res) => setCitiesForState(res.map((r) => ({ id: r.id, city: r.city }))))
        .catch(() => setCitiesForState([]))
    } else {
      setCitiesForState([])
    }
  }, [formData.state])

  const BRAZIL_STATES = [
    'AC',
    'AL',
    'AP',
    'AM',
    'BA',
    'CE',
    'DF',
    'ES',
    'GO',
    'MA',
    'MT',
    'MS',
    'MG',
    'PA',
    'PB',
    'PR',
    'PE',
    'PI',
    'RJ',
    'RN',
    'RS',
    'RO',
    'RR',
    'SC',
    'SP',
    'SE',
    'TO',
  ]

  const availableNetworks = formData.utility_id
    ? Array.from(
        new Set(
          tariffRules
            .filter((r) => r.utility_id === formData.utility_id)
            .map((r) => r.network_type)
            .filter(Boolean),
        ),
      )
    : []
  const networkOptions = availableNetworks.length > 0 ? availableNetworks : NETWORK_TYPES

  const matchedRule =
    formData.utility_id && formData.network_type
      ? tariffRules.find(
          (r) => r.utility_id === formData.utility_id && r.network_type === formData.network_type,
        )
      : null

  useEffect(() => {
    if (matchedRule && matchedRule.voltage)
      setFormData((prev) => ({ ...prev, tension: matchedRule.voltage }))
    else setFormData((prev) => ({ ...prev, tension: '' }))
  }, [matchedRule])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!formData.city_id) throw new Error('Selecione uma cidade válida.')
      const firstStage = stages.sort((a, b) => a.order - b.order)[0]
      if (!firstStage) throw new Error('Nenhum estágio configurado no funil.')

      const utilityName = utilities.find((u) => u.id === formData.utility_id)?.name || ''
      const fullAddress = `${formData.address}, ${formData.number} - ${formData.neighborhood}, ${formData.city} - ${formData.state}, ${formData.cep}`

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
        city_id: formData.city_id,
        neighborhood: formData.neighborhood,
        number: formData.number,
        address: fullAddress,
        uc: formData.uc,
        avg_consumption: Number(formData.avg_consumption) || 0,
        owner_id: user?.id,
        tags: [],
        use_roof_faces: false,
        roof_faces_data: [],
        sizing: {
          tension: formData.tension,
          network_type: formData.network_type,
          address_struct: {
            street: formData.address,
            number: formData.number,
            neighborhood: formData.neighborhood,
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
        neighborhood: '',
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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0 border-b">
          <DialogTitle>Nova Negociação</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 flex-1 overflow-y-auto scrollbar-thin">
            <div className="space-y-4 pb-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2 sm:col-span-4">
                  <Label>Título (Identificador)</Label>
                  <Input
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Sistema 5kWp Sr. João"
                  />
                </div>
                <div className="space-y-2 sm:col-span-4">
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

                <div className="col-span-4 border-t pt-2 mt-2">
                  <h4 className="text-sm font-semibold mb-3">Endereço de Instalação</h4>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>CEP</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                      maxLength={9}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={searchCep}
                      disabled={isSearchingCep}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Rua / Av</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Número</Label>
                  <Input
                    value={formData.number}
                    onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Bairro</Label>
                  <Input
                    value={formData.neighborhood}
                    onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Estado (UF)</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(val) => setFormData({ ...formData, state: val, city: '' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAZIL_STATES.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Cidade</Label>
                  <LocationCombobox
                    cities={citiesForState}
                    value={formData.city_id}
                    onChange={(id: string, city: string) =>
                      setFormData({ ...formData, city_id: id, city })
                    }
                    disabled={!formData.state}
                  />
                </div>

                <div className="col-span-4 border-t pt-2 mt-2">
                  <h4 className="text-sm font-semibold mb-3">Dados da Rede</h4>
                </div>

                <div className="space-y-2 sm:col-span-2">
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
                <div className="space-y-2 sm:col-span-1">
                  <Label>Tipo de Rede</Label>
                  <Select
                    value={formData.network_type}
                    onValueChange={(val) => setFormData({ ...formData, network_type: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {networkOptions.map((n) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-1">
                  <Label>Tensão da Instalação</Label>
                  <Input
                    value={formData.tension}
                    readOnly
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>UC</Label>
                  <Input
                    value={formData.uc}
                    onChange={(e) => setFormData({ ...formData, uc: e.target.value })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Consumo Médio (kWh)</Label>
                  <Input
                    type="number"
                    value={formData.avg_consumption}
                    onChange={(e) => setFormData({ ...formData, avg_consumption: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="p-6 border-t bg-background shrink-0 flex justify-end">
            <Button type="submit">Criar Negociação</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
