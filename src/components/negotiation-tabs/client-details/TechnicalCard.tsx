import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
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

export function TechnicalCard({ neg, reload }: { neg: any; reload?: () => void }) {
  const initialSizing = neg.sizing || {}
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const [installations, setInstallations] = useState<any[]>([])
  const [formData, setFormData] = useState({
    installation_id: initialSizing.installation_id || initialSizing.installation_type || '',
    available_roof_area: neg.available_roof_area != null ? String(neg.available_roof_area) : '',
  })

  useEffect(() => {
    setFormData({
      installation_id: neg.sizing?.installation_id || neg.sizing?.installation_type || '',
      available_roof_area: neg.available_roof_area != null ? String(neg.available_roof_area) : '',
    })
  }, [neg])

  useEffect(() => {
    if (neg.company_id) {
      pb.collection('pv_installations')
        .getFullList({ filter: `company_id='${neg.company_id}'` })
        .then(setInstallations)
        .catch(console.error)
    }
  }, [neg.company_id])

  const handleSave = async () => {
    setLoading(true)
    try {
      const newSizing = {
        ...neg.sizing,
        installation_id: formData.installation_id,
        installation_type: formData.installation_id, // mantido por compatibilidade
      }
      const roofAreaNum =
        formData.available_roof_area === '' ? 0 : Number(formData.available_roof_area)
      await updateNegotiation(neg.id, {
        sizing: newSizing,
        available_roof_area: isNaN(roofAreaNum) ? 0 : roofAreaNum,
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

  const currentInstId = initialSizing.installation_id || initialSizing.installation_type || ''
  const selectedInstName =
    installations.find((i) => i.id === currentInstId)?.name || currentInstId || '-'
  const roofAreaDisplay =
    neg.available_roof_area != null && Number(neg.available_roof_area) > 0
      ? `${Number(neg.available_roof_area).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²`
      : 'Não informada'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" /> Informações Técnicas
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </Button>
      </CardHeader>
      <CardContent className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Tipo de Instalação</p>
          <p className="font-medium">{selectedInstName}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Área disponível para instalação</p>
          <p className="font-medium">{roofAreaDisplay}</p>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Informações Técnicas</DialogTitle>
            <VisuallyHidden>
              <DialogDescription>
                Edite o tipo de instalação e informações técnicas.
              </DialogDescription>
            </VisuallyHidden>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Instalação</Label>
              <Select
                value={formData.installation_id}
                onValueChange={(v) => setFormData({ ...formData, installation_id: v })}
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
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Área disponível para instalação (m²)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder="Ex: 45.0"
                value={formData.available_roof_area}
                onChange={(e) => setFormData({ ...formData, available_roof_area: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Espaço livre em telhado ou solo para posicionamento dos módulos fotovoltaicos.
              </p>
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
