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

  const [distributorId, setDistributorId] = useState(initialSizing.distributor_id || '')
  const [networkType, setNetworkType] = useState(initialSizing.network_type || '')
  const [consumerClass, setConsumerClass] = useState(initialSizing.consumer_class || '')
  const [tension, setTension] = useState(initialSizing.tension || '')

  const [uc, setUc] = useState(neg.uc || '')
  const [installationType, setInstallationType] = useState(initialSizing.installation_type || '')

  const [installations, setInstallations] = useState<any[]>([])
  const [distributors, setDistributors] = useState<any[]>([])
  const [tariffRules, setTariffRules] = useState<any[]>([])

  const [addressStruct, setAddressStruct] = useState(
    initialSizing.address_struct || {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zip: '',
    },
  )

  useEffect(() => {
    if (neg?.company_id) {
      pb.collection('pv_installations')
        .getFullList({ filter: `company_id='${neg.company_id}'` })
        .then(setInstallations)
        .catch(console.error)

      pb.collection('pv_distributors')
        .getFullList({ filter: `company_id='${neg.company_id}'` })
        .then(setDistributors)
        .catch(console.error)

      pb.collection('pv_tariff_rules')
        .getFullList({ filter: `company_id='${neg.company_id}'` })
        .then(setTariffRules)
        .catch(console.error)
    }
  }, [neg?.company_id])

  // Derive available options based on rules
  const availableNetworks = distributorId
    ? Array.from(
        new Set(
          tariffRules.filter((r) => r.distributor_id === distributorId).map((r) => r.network_type),
        ),
      )
    : []
  const networkOptions = availableNetworks.length > 0 ? availableNetworks : NETWORK_TYPES

  const availableClasses =
    distributorId && networkType
      ? Array.from(
          new Set(
            tariffRules
              .filter((r) => r.distributor_id === distributorId && r.network_type === networkType)
              .map((r) => r.class),
          ),
        )
      : []
  const classOptions = availableClasses.length > 0 ? availableClasses : AVAILABLE_CLASSES

  // Automatically update tension
  useEffect(() => {
    if (distributorId && networkType && consumerClass) {
      const rule = tariffRules.find(
        (r) =>
          r.distributor_id === distributorId &&
          r.network_type === networkType &&
          r.class === consumerClass,
      )
      if (rule && rule.voltage) {
        setTension(rule.voltage)
      }
    }
  }, [distributorId, networkType, consumerClass, tariffRules])

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

      const fullAddress = `${addressStruct.street}, ${addressStruct.number} - ${addressStruct.neighborhood}, ${addressStruct.city} - ${addressStruct.state}, ${addressStruct.zip}`

      const ruleSnapshot = tariffRules.find(
        (r) =>
          r.distributor_id === distributorId &&
          r.network_type === networkType &&
          r.class === consumerClass,
      )

      const cleanSizing = {
        ...initialSizing,
        ...sizingPayload,
        distributor_id: distributorId,
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

      const selectedDistName = distributors.find((d) => d.id === distributorId)?.name || ''

      await updateNegotiation(neg.id, {
        avg_consumption: computedAvg,
        concessionaire: selectedDistName,
        uc,
        address: fullAddress,
        sizing: cleanSizing,
      })

      toast({ title: 'Dados atualizados com sucesso' })
      if (reload) {
        reload()
      } else {
        window.location.reload()
      }
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: getErrorMessage(e),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados Principais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{lead.name || 'Não informado'}</p>
              <p className="text-sm text-muted-foreground">Nome Completo / Razão Social</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{maskCPF(lead.document) || 'Não informado'}</p>
              <p className="text-sm text-muted-foreground">CPF / CNPJ</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{maskPhone(lead.phone) || 'Não informado'}</p>
              <p className="text-sm text-muted-foreground">Telefone Principal</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">{lead.email || 'Não informado'}</p>
              <p className="text-sm text-muted-foreground">E-mail</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Local de Instalação e Consumo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Endereço da Instalação
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Rua / Av</Label>
                  <Input
                    value={addressStruct.street}
                    onChange={(e) => setAddressStruct({ ...addressStruct, street: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Número</Label>
                  <Input
                    value={addressStruct.number}
                    onChange={(e) => setAddressStruct({ ...addressStruct, number: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Bairro</Label>
                  <Input
                    value={addressStruct.neighborhood}
                    onChange={(e) =>
                      setAddressStruct({ ...addressStruct, neighborhood: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>CEP</Label>
                  <Input
                    value={addressStruct.zip}
                    onChange={(e) =>
                      setAddressStruct({ ...addressStruct, zip: maskCEP(e.target.value) })
                    }
                    maxLength={9}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Cidade</Label>
                  <Input
                    value={addressStruct.city}
                    onChange={(e) => setAddressStruct({ ...addressStruct, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>UF</Label>
                  <Input
                    value={addressStruct.state}
                    onChange={(e) =>
                      setAddressStruct({ ...addressStruct, state: e.target.value.toUpperCase() })
                    }
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" /> Dados da Rede
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Concessionária</Label>
                  <Select value={distributorId} onValueChange={setDistributorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {distributors.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                      {distributors.length === 0 && (
                        <SelectItem value="N/A" disabled>
                          Nenhuma configurada
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Unidade Consumidora (UC)</Label>
                  <Input value={uc} onChange={(e) => setUc(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tipo de Rede</Label>
                  <Select value={networkType} onValueChange={setNetworkType}>
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
                  <Select value={consumerClass} onValueChange={setConsumerClass}>
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
                    onChange={(e) => setTension(e.target.value)}
                    placeholder="Ex: 220V"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tipo de Instalação</Label>
                  <Select value={installationType} onValueChange={setInstallationType}>
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

          <div className="border-t pt-6 mt-4">
            <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
              <h3 className="text-md font-semibold">Histórico de Consumo</h3>
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
            </div>

            {!isMonthly ? (
              <div className="flex items-end gap-4 max-w-sm">
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
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
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

            <div className="mt-4 flex flex-wrap gap-4 items-center justify-between">
              <p className="text-sm font-medium">
                Média calculada/atual:{' '}
                <span className="text-primary text-lg ml-1">{neg.avg_consumption || 0} kWh</span>
              </p>
              <Button onClick={handleSaveConsumption} disabled={loading} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Salvar Dados
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
