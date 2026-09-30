import { useState, useEffect } from 'react'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FileText, ExternalLink, ArrowRight } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Badge } from '@/components/ui/badge'
import { ProposalViewer } from '@/components/ProposalViewer'

export default function Proposals() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [proposals, setProposals] = useState<any[]>([])
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null)

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
                <CardTitle className="text-base flex items-center gap-2">
                  {p.proposal_code && (
                    <Badge variant="outline" className="font-mono text-primary border-primary/40">
                      {p.proposal_code}
                    </Badge>
                  )}
                  <span>{p.description || 'Proposta Fotovoltaica'}</span>
                  <Badge
                    className="ml-1"
                    variant={
                      p.status === 'accepted'
                        ? 'default'
                        : p.status === 'denied'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {p.status === 'accepted'
                      ? 'Aceita'
                      : p.status === 'denied'
                        ? 'Recusada'
                        : 'Pendente'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Negociação: {p.expand?.negotiation_id?.title || 'Desconhecida'} •{' '}
                  {p.payment_terms || 'Condições padrão'}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 w-full sm:w-auto justify-end border-t sm:border-t-0 mt-2 sm:mt-0">
              <span className="font-bold mr-4">
                {typeof p.total_value === 'number'
                  ? p.total_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : typeof p.price === 'number'
                    ? p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : 'R$ 0,00'}
              </span>

              {p.generator_view_url ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(p.generator_view_url, '_blank')}
                  title="Abrir proposta oficial"
                  className="gap-1.5"
                >
                  <ExternalLink className="h-4 w-4" /> Visualizar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedProposal(p)}
                  title="Visualizar proposta"
                  className="gap-1.5"
                >
                  <FileText className="h-4 w-4" /> Visualizar
                </Button>
              )}

              {p.negotiation_id && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate(`/negociacoes/${p.negotiation_id}`)}
                  title="Abrir Negociação"
                  className="gap-1"
                >
                  Negociação <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {selectedProposal && (
        <ProposalViewer
          open={!!selectedProposal}
          onOpenChange={(v: boolean) => !v && setSelectedProposal(null)}
          proposal={selectedProposal}
          negotiation={selectedProposal?.expand?.negotiation_id}
        />
      )}
    </div>
  )
}
