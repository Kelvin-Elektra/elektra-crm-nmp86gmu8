import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
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
  })

  useEffect(() => {
    if (open && neg.company_id) {
      pb.collection('pv_installations')
        .getFullList({ filter: `company_id='${neg.company_id}'` })
        .then(setInstallations)
        .catch(console.error)
    }
  }, [open, neg.company_id])

  const handleSave = async () => {
    setLoading(true)
    try {
      const newSizing = {
        ...neg.sizing,
        installation_id: formData.installation_id,
        installation_type: formData.installation_id, // mantido por compatibilidade
      }
      await updateNegotiation(neg.id, { sizing: newSizing })
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
      <CardContent className="mt-2">
        <div>
          <p className="text-sm text-muted-foreground">Tipo de Instalação</p>
          <p className="font-medium">{selectedInstName}</p>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Informações Técnicas</DialogTitle>
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
