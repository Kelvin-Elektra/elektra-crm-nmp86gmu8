import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Calendar, Eye } from 'lucide-react'
import { format } from 'date-fns'

export function ProposalsTab({ proposals }: { proposals: any[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Propostas Fotovoltaicas</CardTitle>
          <CardDescription>Histórico de propostas comerciais enviadas.</CardDescription>
        </div>
        <Button size="sm">
          <FileText className="h-4 w-4 mr-2" /> Gerar Proposta
        </Button>
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
                className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{p.description || 'Proposta Padrão'}</p>
                    <p className="text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {format(new Date(p.created), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 md:text-right">
                  <div>
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
                  <Button variant="outline" size="icon" title="Pré-visualizar">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
