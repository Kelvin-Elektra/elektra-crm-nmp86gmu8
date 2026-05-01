import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Pencil } from 'lucide-react'
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
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { maskCPF, maskPhone } from '@/lib/masks'

export function ClientInfoCard({ neg, reload }: { neg: any; reload?: () => void }) {
  const lead = neg.expand?.lead_id || {}
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: lead.name || '',
    document: lead.document || '',
    phone: lead.phone || '',
    email: lead.email || '',
  })

  const handleSave = async () => {
    setLoading(true)
    try {
      await pb.collection('leads').update(lead.id, formData)
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
          <User className="h-5 w-5" /> Dados do Cliente
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        <div>
          <p className="text-sm text-muted-foreground">Nome / Razão Social</p>
          <p className="font-medium">{lead.name || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">CPF / CNPJ</p>
          <p className="font-medium">{lead.document || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Telefone</p>
          <p className="font-medium">{lead.phone || '-'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">E-mail</p>
          <p className="font-medium">{lead.email || '-'}</p>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo / Razão Social</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CPF / CNPJ</Label>
              <Input
                value={formData.document}
                onChange={(e) => setFormData({ ...formData, document: maskCPF(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
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
