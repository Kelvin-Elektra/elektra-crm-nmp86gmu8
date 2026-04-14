import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getNegotiation, getProposalsByNeg } from '@/services/db'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, User, MapPin, Zap, Calendar, FileText } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { format } from 'date-fns'

export default function NegotiationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [neg, setNeg] = useState<any>(null)
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!id) return
    try {
      const data = await getNegotiation(id)
      setNeg(data)
      const props = await getProposalsByNeg(id)
      setProposals(props)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('negotiations', (e) => {
    if (e.record.id === id) loadData()
  })
  useRealtime('proposals', loadData)

  if (loading) return <div className="p-8 text-center">Carregando...</div>
  if (!neg) return <div className="p-8 text-center text-destructive">Negociação não encontrada</div>

  return (
    <div className="flex flex-col gap-6 max-w-5xl animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/negociacoes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{neg.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{neg.stage}</Badge>
              <span className="text-sm text-muted-foreground flex items-center">
                <User className="h-3 w-3 mr-1" />
                Responsável:{' '}
                <strong className="ml-1">{neg.expand?.owner_id?.name || 'Não atribuído'}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalhes do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">{neg.expand?.lead_id?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {neg.expand?.lead_id?.document || neg.expand?.lead_id?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Endereço de Instalação</p>
                  <p className="text-sm text-muted-foreground">{neg.address || 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Dados Técnicos</p>
                  <p className="text-sm text-muted-foreground">
                    Consumo: {neg.avg_consumption} kWh | Concessionária:{' '}
                    {neg.concessionaire || 'N/A'} | UC: {neg.uc || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Propostas</CardTitle>
              <CardDescription>Histórico de propostas comerciais enviadas.</CardDescription>
            </CardHeader>
            <CardContent>
              {proposals.length === 0 ? (
                <div className="text-center p-6 text-muted-foreground border rounded-lg bg-muted/20">
                  Nenhuma proposta gerada para esta negociação.
                </div>
              ) : (
                <div className="space-y-4">
                  {proposals.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{p.description || 'Proposta'}</p>
                          <p className="text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {format(new Date(p.created), 'dd/MM/yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(p.price || 0)}
                        </p>
                        <Badge
                          variant={
                            p.status === 'accepted'
                              ? 'default'
                              : p.status === 'rejected'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {p.status || 'Rascunho'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" /> Nova Proposta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
