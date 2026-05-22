import { useState, useEffect } from 'react'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Send, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Badge } from '@/components/ui/badge'

export default function Proposals() {
  const { user } = useAuth()
  const [proposals, setProposals] = useState<any[]>([])

  const load = async () => {
    const isStandardUser =
      user?.role !== 'User_elektra' && user?.role !== 'User_owner' && user?.role_company !== 'admin'
    const companyFilter = user?.role === 'User_elektra' ? '' : `company_id = '${user?.company_id}'`
    const ownerFilter = isStandardUser ? `negotiation_id.owner_id = '${user?.id}'` : ''
    const filter = [companyFilter, ownerFilter].filter(Boolean).join(' && ')
    const records = await pb
      .collection('proposals')
      .getFullList({ expand: 'negotiation_id', filter, sort: '-created' })
    setProposals(records)
  }
  useEffect(() => {
    load()
  }, [])
  useRealtime('proposals', load)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Histórico de Propostas</h2>
          <p className="text-muted-foreground">
            Visão geral de todas as propostas geradas no sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {proposals.length === 0 && (
          <div className="text-center p-12 bg-muted/30 rounded-lg border border-dashed">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Nenhuma proposta gerada ainda.</p>
          </div>
        )}
        {proposals.map((p) => (
          <Card
            key={p.id}
            className="flex flex-col sm:flex-row items-center justify-between p-2 hover:bg-muted/30 transition-colors border-border/50"
          >
            <div className="flex items-center gap-4 p-4 w-full sm:w-auto">
              <div className="h-12 w-12 bg-secondary rounded-lg flex items-center justify-center text-secondary-foreground shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {p.description}{' '}
                  <Badge
                    className="ml-2"
                    variant={
                      p.status === 'accepted'
                        ? 'default'
                        : p.status === 'denied'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {p.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Negociação: {p.expand?.negotiation_id?.title || 'Desconhecida'} •{' '}
                  {p.payment_terms}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 w-full sm:w-auto justify-end border-t sm:border-t-0 mt-2 sm:mt-0">
              <span className="font-bold mr-4">R$ {p.price?.toLocaleString('pt-BR')}</span>
              <Button variant="ghost" size="icon" title="Baixar PDF">
                <Download className="h-4 w-4" />
              </Button>
              <Button size="sm" className="ml-2">
                <Send className="h-4 w-4 mr-2" /> Enviar
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
