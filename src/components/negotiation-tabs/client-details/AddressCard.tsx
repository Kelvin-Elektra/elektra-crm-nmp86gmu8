import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Pencil, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LocationCombobox } from '@/components/LocationCombobox'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getCepCache, createCepCache, updateNegotiation } from '@/services/db'
import { maskCEP } from '@/lib/masks'

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

export function AddressCard({ neg, reload }: { neg: any; reload?: () => void }) {
  const initialSizing = neg.sizing || {}
  const addr = initialSizing.address_struct || {}

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [citiesForState, setCitiesForState] = useState<{ id: string; city: string }[]>([])
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    street: addr.street || neg.address?.split(',')[0] || '',
    number: addr.number || neg.number || '',
    neighborhood: addr.neighborhood || neg.neighborhood || '',
    city: addr.city || neg.city || '',
    state: addr.state || neg.state || '',
    zip: addr.zip || neg.cep || '',
    city_id: addr.city_id || neg.city_id || '',
  })

  useEffect(() => {
    if (open && formData.state) {
      pb.collection('pv_hsp_data')
        .getFullList({ filter: `state='${formData.state}'`, sort: 'city' })
        .then((res) => setCitiesForState(res.map((r) => ({ id: r.id, city: r.city }))))
        .catch(() => setCitiesForState([]))
    }
  }, [open, formData.state])

  const handleSearchCEP = async () => {
    const cleanCep = formData.zip.replace(/\D/g, '')
    if (cleanCep.length !== 8) {
      toast({ description: 'CEP inválido', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const cached = await getCepCache(cleanCep)
      if (cached) {
        const cityRec = await pb.collection('pv_hsp_data').getOne(cached.city_id)
        setFormData((prev) => ({
          ...prev,
          street: cached.street || prev.street,
          neighborhood: cached.neighborhood || prev.neighborhood,
          state: cached.state,
          city_id: cached.city_id,
          city: cityRec.city,
        }))
        toast({ description: 'CEP encontrado!', duration: 2000 })
        return
      }

      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
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
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          state: uf,
          city: matchedId ? cityName : '',
          city_id: matchedId,
        }))

        if (matchedId) {
          try {
            await createCepCache({
              cep: cleanCep,
              city_id: matchedId,
              state: uf,
              neighborhood: data.bairro || '',
              street: data.logradouro || '',
            })
          } catch {
            /* intentionally ignored */
          }
        }
        toast({ description: 'CEP encontrado!', duration: 2000 })
      } else {
        toast({ description: 'CEP não encontrado na base.', variant: 'destructive' })
      }
    } catch (e) {
      toast({ description: 'Erro ao buscar CEP', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const fullAddress = `${formData.street}, ${formData.number} - ${formData.neighborhood}, ${formData.city} - ${formData.state}, ${formData.zip}`
      await updateNegotiation(neg.id, {
        cep: formData.zip,
        city: formData.city,
        state: formData.state,
        neighborhood: formData.neighborhood,
        number: formData.number,
        address: fullAddress,
        city_id: formData.city_id,
        sizing: { ...neg.sizing, address_struct: formData },
      })
      toast({ description: 'Dados salvos com sucesso' })
      setOpen(false)
      reload?.()
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao salvar' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Endereço de Instalação
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </Button>
      </CardHeader>
      <CardContent className="mt-2 space-y-1">
        <p className="text-sm font-medium">
          {formData.street ? `${formData.street}, ${formData.number}` : 'Endereço não informado'}
        </p>
        <p className="text-sm text-muted-foreground">
          {formData.neighborhood ? `${formData.neighborhood}` : ''}
        </p>
        <p className="text-sm text-muted-foreground">
          {formData.city ? `${formData.city} - ${formData.state}` : ''}
        </p>
        <p className="text-sm text-muted-foreground">{formData.zip}</p>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Editar Endereço</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-end gap-2">
              <div className="space-y-2 flex-1">
                <Label>CEP</Label>
                <Input
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: maskCEP(e.target.value) })}
                  maxLength={9}
                />
              </div>
              <Button variant="secondary" onClick={handleSearchCEP} disabled={loading}>
                <Search className="h-4 w-4 mr-2" /> Buscar por CEP
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3 space-y-2">
                <Label>Rua / Av</Label>
                <Input
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input
                  value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bairro</Label>
              <Input
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>UF</Label>
                <Select
                  value={formData.state}
                  onValueChange={(val) =>
                    setFormData({ ...formData, state: val, city: '', city_id: '' })
                  }
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
              <div className="col-span-2 space-y-2">
                <Label>Cidade (HSP)</Label>
                <LocationCombobox
                  cities={citiesForState}
                  value={formData.city_id}
                  onChange={(id, city) => setFormData({ ...formData, city_id: id, city })}
                  disabled={!formData.state}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
