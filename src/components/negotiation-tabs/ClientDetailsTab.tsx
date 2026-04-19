import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, MapPin, Zap, Phone, Mail, FileText, Save } from 'lucide-react'
import { maskCPF, maskPhone } from '@/lib/masks'
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

export function ClientDetailsTab({ neg, reload }: { neg: any; reload?: () => void }) {
  const { toast } = useToast()
  const lead = neg.expand?.lead_id || {}
  const [loading, setLoading] = useState(false)

  const initialSizing = neg.sizing || {}
  const isMonthlyInit = initialSizing.type === 'monthly'

  const [isMonthly, setIsMonthly] = useState(isMonthlyInit)
  const [avgConsumption, setAvgConsumption] = useState(neg.avg_consumption || '')

  const [tension, setTension] = useState(initialSizing.tension || '220V')
  const [installationType, setInstallationType] = useState(initialSizing.installation_type || '')
  const [installations, setInstallations] = useState<any[]>([])

  useEffect(() => {
    if (neg?.company_id) {
      pb.collection('pv_installations')
        .getFullList({ filter: `company_id='${neg.company_id}'` })
        .then(setInstallations)
        .catch(console.error)
    }
  }, [neg?.company_id])

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

      const cleanSizing = {
        ...initialSizing,
        ...sizingPayload,
        tension,
        installation_type: installationType,
      }

      // Ensure cleanSizing does not have undefined fields to avoid JSON stringify issues
      Object.keys(cleanSizing).forEach(
        (key) =>
          cleanSizing[key as keyof typeof cleanSizing] === undefined &&
          delete cleanSizing[key as keyof typeof cleanSizing],
      )

      await updateNegotiation(neg.id, {
        avg_consumption: computedAvg,
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
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{neg.address || 'Não informado'}</p>
                <p className="text-sm text-muted-foreground">Endereço Completo</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">
                  Concessionária: {neg.concessionaire || 'N/A'} | UC: {neg.uc || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">Dados da Rede</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4 mt-2">
            <div className="space-y-2">
              <Label>Tensão da Instalação</Label>
              <Select value={tension} onValueChange={setTension}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a tensão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="220V">220V</SelectItem>
                  <SelectItem value="380V">380V</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Instalação</Label>
              <datalist id="installations-list">
                {installations.map((inst) => (
                  <option key={inst.id} value={inst.name} />
                ))}
              </datalist>
              <Input
                list="installations-list"
                value={installationType}
                onChange={(e) => setInstallationType(e.target.value)}
                placeholder="Ex: Telhado Cerâmico, Solo..."
              />
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
