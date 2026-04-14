import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin, Zap, CheckCircle, XCircle } from 'lucide-react'
import { getProposalsByNeg, updateProposal, createProposal } from '@/services/db'
import { useRealtime } from '@/hooks/use-realtime'

export function NegotiationSheet({ negotiation, open, onOpenChange }: any) {
  const [proposals, setProposals] = useState<any[]>([])

  const loadProps = async () => {
    if (negotiation) {
      const data = await getProposalsByNeg(negotiation.id)
      setProposals(data)
    }
  }

  useEffect(() => {
    loadProps()
  }, [negotiation])
  useRealtime('proposals', loadProps, !!negotiation)

  if (!negotiation) return null
  const lead = negotiation.expand?.lead_id

  const handleCreateProp = async () => {
    await createProposal({
      company_id: negotiation.company_id,
      negotiation_id: negotiation.id,
      description: 'Nova Proposta (Rascunho)',
      kit_details: 'Pendente de dimensionamento',
      price: 0,
      status: 'pending',
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{negotiation.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6">
          <Tabs defaultValue="info">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">
                Técnico & Lead
              </TabsTrigger>
              <TabsTrigger value="proposals" className="flex-1">
                Propostas ({proposals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4 animate-fade-in">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">Dados do Lead</h4>
                <p className="text-sm">
                  <Building2 className="inline h-4 w-4 mr-2 text-muted-foreground" />
                  {lead?.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {lead?.document} | {lead?.email} | {lead?.phone}
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm">Dados Técnicos da Instalação</h4>
                <p className="text-sm">
                  <Zap className="inline h-4 w-4 mr-2 text-muted-foreground" />
                  {negotiation.concessionaire || 'Não informada'} (UC:{' '}
                  {negotiation.uc || 'Não informada'})
                </p>
                <p className="text-sm">
                  <MapPin className="inline h-4 w-4 mr-2 text-muted-foreground" />
                  {negotiation.address || 'Não informado'}
                </p>
                <p className="text-sm text-muted-foreground pt-2 border-t mt-2">
                  Consumo Médio Estimado:{' '}
                  <span className="font-medium text-foreground">
                    {negotiation.avg_consumption || 0} kWh
                  </span>
                </p>
              </div>
            </TabsContent>

            <TabsContent value="proposals" className="space-y-4 mt-4 animate-fade-in">
              <div className="flex justify-end">
                <Button size="sm" onClick={handleCreateProp}>
                  Nova Proposta
                </Button>
              </div>
              {proposals.length === 0 && (
                <div className="text-center p-8 text-muted-foreground border border-dashed rounded-lg">
                  Nenhuma proposta gerada para esta negociação.
                </div>
              )}
              {proposals.map((p) => (
                <div
                  key={p.id}
                  className="border p-4 rounded-lg space-y-2 shadow-sm transition-colors hover:border-primary/40"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{p.description}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2">{p.kit_details}</p>
                    </div>
                    <Badge
                      variant={
                        p.status === 'accepted'
                          ? 'default'
                          : p.status === 'denied'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {p.status === 'pending'
                        ? 'Pendente'
                        : p.status === 'accepted'
                          ? 'Aceita'
                          : 'Recusada'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold">R$ {p.price?.toLocaleString('pt-BR')}</span>
                    {p.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => updateProposal(p.id, { status: 'denied' })}
                        >
                          <XCircle className="h-4 w-4 mr-1" /> Recusar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => updateProposal(p.id, { status: 'accepted' })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" /> Aceitar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
