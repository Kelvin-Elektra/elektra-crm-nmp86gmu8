import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Pencil } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { updateNegotiation } from '@/services/db'

const NETWORK_TYPES = ['Monofásico', 'Bifásico', 'Trifásico', 'Monofásico rural']
const AVAILABLE_CLASSES = ['Residencial', 'Comercial', 'Industrial', 'Rural', 'Outros']

export function UtilityCard({ neg, reload }: { neg: any; reload?: () => void }) {
  const initialSizing = neg.sizing || {}
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [utilities, setUtilities] = useState<any[]>([])
  const [installations, setInstallations] = useState<any[]>([])
  const [tariffRules, setTariffRules] = useState<any[]>([])

  const [formData, setFormData] = useState({
    utility_id: neg.utility_id || initialSizing.utility_id || '',
    uc: neg.uc || '',
    network_type: initialSizing.network_type || '',
    consumer_class: initialSizing.consumer_class || '',
    tension: initialSizing.tension || '',
  })

  useEffect(() => {
    if (open && neg.company_id) {
      Promise.all([
        pb.collection('pv_utilities').getFullList({ filter: `company_id='${neg.company_id}'` }),
        pb.collection('pv_tariff_rules').getFullList({ filter: `company_id='${neg.company_id}'` }),
      ])
        .then(([utils, rules]) => {
          setUtilities(utils)
          setTariffRules(rules)
        })
        .catch(console.error)
    }
  }, [open, neg.company_id])

  useEffect(() => {
    if (!open) return
    const matchedRule =
      tariffRules.find(
        (r) =>
          r.utility_id === formData.utility_id &&
          r.network_type === formData.network_type &&
          (!formData.consumer_class || r.class === formData.consumer_class),
      ) ||
      tariffRules.find(
        (r) => r.utility_id === formData.utility_id && r.network_type === formData.network_type,
      )

    setFormData((prev) => ({ ...prev, tension: matchedRule?.voltage || '' }))
  }, [formData.utility_id, formData.network_type, formData.consumer_class, tariffRules, open])

  const handleSave = async () => {
    setLoading(true)
    try {
      const ruleSnapshot = tariffRules.find(
        (r) =>
          r.utility_id === formData.utility_id &&
          r.network_type === formData.network_type &&
          r.class === formData.consumer_class,
      )
      const selectedUtilName = utilities.find((d) => d.id === formData.utility_id)?.name || ''

      const newSizing = {
        ...neg.sizing,
        utility_id: formData.utility_id,
        network_type: formData.network_type,
        consumer_class: formData.consumer_class,
        tension: formData.tension,
        tariff_snapshot: ruleSnapshot
          ? {
              te: ruleSnapshot.te,
              tusd: ruleSnapshot.tusd,
              icms_exemption: ruleSnapshot.icms_exemption,
            }
          : initialSizing.tariff_snapshot,
      }

      await updateNegotiation(neg.id, {
        utility_id: formData.utility_id,
        concessionaire: selectedUtilName,
        uc: formData.uc,
        sizing: newSizing,
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

  const availableClasses =
    formData.utility_id && formData.network_type
      ? Array.from(
          new Set(
            tariffRules
              .filter(
                (r) =>
                  r.utility_id === formData.utility_id && r.network_type === formData.network_type,
              )
              .map((r) => r.class)
              .filter(Boolean),
          ),
        )
      : []
  const classOptions = availableClasses.length > 0 ? availableClasses : AVAILABLE_CLASSES

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" /> Concessionária e Rede
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 mt-2">
        <div>
          <p className="text-sm text-muted-foreground">Concessionária</p>
          <p className="font-medium">{neg.concessionaire || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">UC</p>
          <p className="font-medium">{neg.uc || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Tipo de Rede</p>
          <p className="font-medium">{initialSizing.network_type || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Classe / Tensão</p>
          <p className="font-medium">
            {initialSizing.consumer_class || '-'} / {initialSizing.tension || '-'}
          </p>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Concessionária e Rede</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Concessionária</Label>
                <Select
                  value={formData.utility_id}
                  onValueChange={(v) => setFormData({ ...formData, utility_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {utilities.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo de Rede</Label>
                <Select
                  value={formData.network_type}
                  onValueChange={(v) => setFormData({ ...formData, network_type: v })}
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
              <div className="space-y-2">
                <Label>Classe de Consumo</Label>
                <Select
                  value={formData.consumer_class}
                  onValueChange={(v) => setFormData({ ...formData, consumer_class: v })}
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

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label>Tensão da Instalação</Label>
                <Input value={formData.tension} readOnly disabled className="bg-muted/50" />
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
