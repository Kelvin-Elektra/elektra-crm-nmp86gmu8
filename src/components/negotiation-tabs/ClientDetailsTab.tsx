import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, MapPin, Zap, Phone, Mail, FileText, Save } from 'lucide-react'
import { maskCPF, maskPhone, maskCEP } from '@/lib/masks'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { updateNegotiation } from '@/services/db'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'
import { LocationCombobox } from '@/components/LocationCombobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NETWORK_TYPES = ['Monofásico', 'Bifásico', 'Trifásico', 'Monofásico rural']
const AVAILABLE_CLASSES = ['Residencial', 'Comercial', 'Industrial', 'Rural', 'Outros']

export function ClientDetailsTab({ neg, reload }: { neg: any; reload?: () => void }) {
  const { toast } = useToast()
  const lead = neg.expand?.lead_id || {}
  const [loading, setLoading] = useState(false)

  const initialSizing = neg.sizing || {}
  const isMonthlyInit = initialSizing.type === 'monthly'

  const [isMonthly, setIsMonthly] = useState(isMonthlyInit)
  const [avgConsumption, setAvgConsumption] = useState(neg.avg_consumption || '')

  const [utilityId, setUtilityId] = useState(neg.utility_id || initialSizing.utility_id || '')
  const [networkType, setNetworkType] = useState(initialSizing.network_type || '')
  const [consumerClass, setConsumerClass] = useState(initialSizing.consumer_class || '')
  const [tension, setTension] = useState(initialSizing.tension || '')

  const [uc, setUc] = useState(neg.uc || '')
  const [installationType, setInstallationType] = useState(initialSizing.installation_type || '')

  const [leadDoc, setLeadDoc] = useState(lead.document || '')
  const [leadPhone, setLeadPhone] = useState(lead.phone || '')
  const [leadEmail, setLeadEmail] = useState(lead.email || '')

  const [installations, setInstallations] = useState<any[]>([])
  const [utilities, setUtilities] = useState<any[]>([])
  const [tariffRules, setTariffRules] = useState<any[]>([])
  const [citiesForState, setCitiesForState] = useState<{ id: string; city: string }[]>([])

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

  const [addressStruct, setAddressStruct] = useState({
    street: initialSizing.address_struct?.street || '',
    number: initialSizing.address_struct?.number || neg.number || '',
    neighborhood: initialSizing.address_struct?.neighborhood || neg.neighborhood || '',
    city: initialSizing.address_struct?.city || neg.city || '',
    state: initialSizing.address_struct?.state || neg.state || '',
    zip: initialSizing.address_struct?.zip || neg.cep || '',
    city_id: initialSizing.address_struct?.city_id || neg.city_id || '',
  })

  useEffect(() => {
    if (neg?.company_id) {
      pb.collection('pv_installations')
        .getFullList({ filter: `company_id='${neg.company_id}'` })
        .then(setInstallations)
        .catch(console.error)
      pb.collection('pv_utilities')
        .getFullList({ filter: `company_id='${neg.company_id}'` })
        .then(setUtilities)
        .catch(console.error)
      pb.collection('pv_tariff_rules')
        .getFullList({ filter: `company_id='${neg.company_id}'` })
        .then(setTariffRules)
        .catch(console.error)
    }
  }, [neg?.company_id])

  useEffect(() => {
    const cep = addressStruct.zip.replace(/\D/g, '')
    if (cep.length === 8) {
      setAddressStruct((prev) => ({
        ...prev,
        street: '',
        neighborhood: '',
        city: '',
        state: '',
        city_id: '',
      }))
      fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then((res) => res.json())
        .then(async (data) => {
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

            const newAddr = {
              ...addressStruct,
              street: data.logradouro || '',
              neighborhood: data.bairro || '',
              state: uf,
              city: matchedId ? cityName : '',
              city_id: matchedId,
              zip: data.cep || addressStruct.zip,
            }
            setAddressStruct(newAddr)
            saveAddress(newAddr)
          }
        })
        .catch(console.error)
    }
  }, [addressStruct.zip])

  useEffect(() => {
    if (addressStruct.state) {
      pb.collection('pv_hsp_data')
        .getFullList({ filter: `state='${addressStruct.state}'`, sort: 'city' })
        .then((res) => setCitiesForState(res.map((r) => ({ id: r.id, city: r.city }))))
        .catch(() => setCitiesForState([]))
    } else {
      setCitiesForState([])
    }
  }, [addressStruct.state])

  const availableNetworks = utilityId
    ? Array.from(
        new Set(
          tariffRules
            .filter((r) => r.utility_id === utilityId)
            .map((r) => r.network_type)
            .filter(Boolean),
        ),
      )
    : []
  const networkOptions = availableNetworks.length > 0 ? availableNetworks : NETWORK_TYPES

  const matchedRule =
    utilityId && networkType
      ? tariffRules.find(
          (r) =>
            r.utility_id === utilityId &&
            r.network_type === networkType &&
            (!consumerClass || r.class === consumerClass),
        ) || tariffRules.find((r) => r.utility_id === utilityId && r.network_type === networkType)
      : null

  useEffect(() => {
    if (matchedRule && matchedRule.voltage) {
      setTension(matchedRule.voltage)
    } else {
      setTension('')
    }
  }, [matchedRule])

  const availableClasses =
    utilityId && networkType
      ? Array.from(
          new Set(
            tariffRules
              .filter((r) => r.utility_id === utilityId && r.network_type === networkType)
              .map((r) => r.class)
              .filter(Boolean),
          ),
        )
      : []
  const classOptions = availableClasses.length > 0 ? availableClasses : AVAILABLE_CLASSES

  const [monthlyData, setMonthlyData] = useState({
    jan: initialSizing.jan || '',
    feb: initialSizing.feb || '',
    mar: initialSizing.mar || '',
    apr: initialSizing.apr || '',
    may: initialSizing.may || '',
    jun: initialSizing.jun || '',
    jul: initialSizing.jul || '',
    aug: initialSizing.aug || '',
    sep: initialSizing.sep || '',
    oct: initialSizing.oct || '',
    nov: initialSizing.nov || '',
    dec: initialSizing.dec || '',
  })

  const months = [
    { k: 'jan', l: 'Jan' },
    { k: 'feb', l: 'Fev' },
    { k: 'mar', l: 'Mar' },
    { k: 'apr', l: 'Abr' },
    { k: 'may', l: 'Mai' },
    { k: 'jun', l: 'Jun' },
    { k: 'jul', l: 'Jul' },
    { k: 'aug', l: 'Ago' },
    { k: 'sep', l: 'Set' },
    { k: 'oct', l: 'Out' },
    { k: 'nov', l: 'Nov' },
    { k: 'dec', l: 'Dez' },
  ]

  const handleLeadSave = async (field: string, value: any, label: string) => {
    try {
      await pb.collection('leads').update(lead.id, { [field]: value })
      toast({ description: `Valor salvo: ${label}` })
    } catch {
      /* intentionally ignored */
    }
  }

  const handleNegSave = async (field: string, value: any, label: string) => {
    try {
      await pb.collection('negotiations').update(neg.id, { [field]: value })
      toast({ description: `Valor salvo: ${label}` })
    } catch {
      /* intentionally ignored */
    }
  }

  const saveAddress = async (addr: any) => {
    try {
      const fullAddress = `${addr.street}, ${addr.number} - ${addr.neighborhood}, ${addr.city} - ${addr.state}, ${addr.zip}`
      await pb.collection('negotiations').update(neg.id, {
        cep: addr.zip,
        city: addr.city,
        state: addr.state,
        neighborhood: addr.neighborhood,
        number: addr.number,
        address: fullAddress,
        city_id: addr.city_id,
        sizing: { ...neg.sizing, address_struct: addr },
      })
      toast({ description: 'Valor salvo: Endereço' })
    } catch {
      /* intentionally ignored */
    }
  }

  const handleUtilitySave = async (uid: string) => {
    setUtilityId(uid)
    const selectedUtilName = utilities.find((d) => d.id === uid)?.name || ''
    try {
      await pb.collection('negotiations').update(neg.id, {
        utility_id: uid,
        concessionaire: selectedUtilName,
      })
      toast({ description: 'Valor salvo: Concessionária' })
    } catch {
      /* intentionally ignored */
    }
  }

  const handleSaveConsumption = async () => {
    setLoading(true)
    try {
      let computedAvg = 0
      let sizingPayload: any = { type: isMonthly ? 'monthly' : 'average' }

      if (isMonthly) {
        const vals = Object.values(monthlyData).map((v) => Number(v) || 0)
        computedAvg = Math.round(vals.reduce((a, b) => a + b, 0) / 12)
        sizingPayload = { ...sizingPayload, ...monthlyData }
      } else {
        computedAvg = Number(avgConsumption) || 0
      }

      const ruleSnapshot = tariffRules.find(
        (r) =>
          r.utility_id === utilityId && r.network_type === networkType && r.class === consumerClass,
      )

      const cleanSizing = {
        ...initialSizing,
        ...sizingPayload,
        utility_id: utilityId,
        network_type: networkType,
        consumer_class: consumerClass,
        tension,
        installation_type: installationType,
        address_struct: addressStruct,
        tariff_snapshot: ruleSnapshot
          ? {
              te: ruleSnapshot.te,
              tusd: ruleSnapshot.tusd,
              icms_exemption: ruleSnapshot.icms_exemption,
            }
          : initialSizing.tariff_snapshot,
      }

      Object.keys(cleanSizing).forEach(
        (key) =>
          cleanSizing[key as keyof typeof cleanSizing] === undefined &&
          delete cleanSizing[key as keyof typeof cleanSizing],
      )

      await updateNegotiation(neg.id, {
        avg_consumption: computedAvg,
        sizing: cleanSizing,
      })

      toast({ title: 'Consumo atualizado com sucesso' })
      if (reload) reload()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: getErrorMessage(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados Principais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo / Razão Social</Label>
              <div className="flex items-center gap-3 bg-muted/50 p-2 rounded-md">
                <User className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{lead.name || 'Não informado'}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label>CPF / CNPJ</Label>
              <div className="flex gap-2 items-center">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <Input
                  value={leadDoc}
                  onChange={(e) => setLeadDoc(maskCPF(e.target.value))}
                  onBlur={() => handleLeadSave('document', leadDoc, 'CPF/CNPJ')}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Telefone Principal</Label>
              <div className="flex gap-2 items-center">
                <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                <Input
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(maskPhone(e.target.value))}
                  onBlur={() => handleLeadSave('phone', leadPhone, 'Telefone')}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <div className="flex gap-2 items-center">
                <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                <Input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  onBlur={() => handleLeadSave('email', leadEmail, 'E-mail')}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5" /> Local de Instalação e Rede
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-medium text-muted-foreground">Endereço</h3>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>CEP</Label>
                  <Input
                    value={addressStruct.zip}
                    onChange={(e) =>
                      setAddressStruct({ ...addressStruct, zip: maskCEP(e.target.value) })
                    }
                    maxLength={9}
                    onBlur={() => saveAddress(addressStruct)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label>Rua / Av</Label>
                    <Input
                      value={addressStruct.street}
                      onChange={(e) =>
                        setAddressStruct({ ...addressStruct, street: e.target.value })
                      }
                      onBlur={() => saveAddress(addressStruct)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Número</Label>
                    <Input
                      value={addressStruct.number}
                      onChange={(e) =>
                        setAddressStruct({ ...addressStruct, number: e.target.value })
                      }
                      onBlur={() => saveAddress(addressStruct)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Bairro</Label>
                  <Input
                    value={addressStruct.neighborhood}
                    onChange={(e) =>
                      setAddressStruct({ ...addressStruct, neighborhood: e.target.value })
                    }
                    onBlur={() => saveAddress(addressStruct)}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>UF</Label>
                    <Select
                      value={addressStruct.state}
                      onValueChange={(val) => {
                        const addr = { ...addressStruct, state: val, city: '', city_id: '' }
                        setAddressStruct(addr)
                        saveAddress(addr)
                      }}
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
                  <div className="col-span-2 space-y-1">
                    <Label>Cidade</Label>
                    <LocationCombobox
                      cities={citiesForState}
                      value={addressStruct.city_id}
                      onChange={(id: string, city: string) => {
                        const addr = { ...addressStruct, city_id: id, city }
                        setAddressStruct(addr)
                        saveAddress(addr)
                      }}
                      disabled={!addressStruct.state}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-muted-foreground">Concessionária e Rede</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Concessionária</Label>
                  <Select value={utilityId} onValueChange={handleUtilitySave}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {utilities.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                      {utilities.length === 0 && (
                        <SelectItem value="N/A" disabled>
                          Nenhuma configurada
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Unidade Consumidora (UC)</Label>
                  <Input
                    value={uc}
                    onChange={(e) => setUc(e.target.value)}
                    onBlur={() => handleNegSave('uc', uc, 'UC')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo de Rede</Label>
                  <Select
                    value={networkType}
                    onValueChange={(val) => {
                      setNetworkType(val)
                      handleNegSave('sizing', { ...neg.sizing, network_type: val }, 'Tipo de Rede')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {networkOptions.map((n: string) => (
                        <SelectItem key={n} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Classe de Consumo</Label>
                  <Select
                    value={consumerClass}
                    onValueChange={(val) => {
                      setConsumerClass(val)
                      handleNegSave(
                        'sizing',
                        { ...neg.sizing, consumer_class: val },
                        'Classe de Consumo',
                      )
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {classOptions.map((c: string) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tensão da Instalação</Label>
                  <Input
                    value={tension}
                    readOnly
                    disabled
                    className="bg-muted/50 cursor-not-allowed"
                    placeholder=""
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tipo de Instalação</Label>
                  <Select
                    value={installationType}
                    onValueChange={(val) => {
                      setInstallationType(val)
                      handleNegSave(
                        'sizing',
                        { ...neg.sizing, installation_type: val },
                        'Tipo de Instalação',
                      )
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {installations.map((i: any) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.name}
                        </SelectItem>
                      ))}
                      {installations.length === 0 && (
                        <SelectItem value="N/A" disabled>
                          Nenhuma configurada
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" /> Histórico de Consumo
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Label
              htmlFor="consumption-mode"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Média Única
            </Label>
            <Switch id="consumption-mode" checked={isMonthly} onCheckedChange={setIsMonthly} />
            <Label
              htmlFor="consumption-mode"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Mês a Mês
            </Label>
          </div>
        </CardHeader>
        <CardContent>
          {!isMonthly ? (
            <div className="flex items-end gap-4 max-w-sm mt-4">
              <div className="space-y-2 flex-1">
                <Label>Consumo Médio (kWh/mês)</Label>
                <Input
                  type="number"
                  value={avgConsumption}
                  onChange={(e) => setAvgConsumption(e.target.value)}
                  placeholder="Ex: 450"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mt-4">
              {months.map((m) => (
                <div key={m.k} className="space-y-1">
                  <Label className="text-xs">{m.l}</Label>
                  <Input
                    type="number"
                    className="h-8 text-sm"
                    value={(monthlyData as any)[m.k]}
                    onChange={(e) => setMonthlyData((p) => ({ ...p, [m.k]: e.target.value }))}
                    placeholder="kWh"
                  />
                </div>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-4 mb-4">
            Média registrada no sistema:{' '}
            <strong className="text-primary">{neg.avg_consumption || 0} kWh</strong>
          </p>
          <Button onClick={handleSaveConsumption} disabled={loading}>
            <Save className="h-4 w-4 mr-2" /> Salvar Consumo
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
