import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, Mail, Phone, Hash, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LeadDialog } from '@/components/LeadDialog'
import pb from '@/lib/pocketbase/client'

export function ClientInfoCard({ neg, reload }: { neg: any; reload?: () => void }) {
  const [open, setOpen] = useState(false)
  const [lead, setLead] = useState<any>(neg?.expand?.lead_id)

  useEffect(() => {
    if (neg?.expand?.lead_id) {
      setLead(neg.expand.lead_id)
    }
  }, [neg])

  const handleLeadSuccess = async () => {
    if (lead?.id) {
      const updatedLead = await pb.collection('leads').getOne(lead.id)
      setLead(updatedLead)
    }
    reload?.()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="h-5 w-5" /> Informações do Cliente
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar Cliente
        </Button>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div className="flex items-start gap-3">
          <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Nome</p>
            <p className="font-medium">{lead?.name || '-'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Hash className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Documento (CPF/CNPJ)</p>
            <p className="font-medium">{lead?.document || '-'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{lead?.email || '-'}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div>
            <p className="text-sm text-muted-foreground">Telefone</p>
            <p className="font-medium">{lead?.phone || '-'}</p>
          </div>
        </div>
      </CardContent>

      {open && (
        <LeadDialog open={open} onOpenChange={setOpen} lead={lead} onSuccess={handleLeadSuccess} />
      )}
    </Card>
  )
}
