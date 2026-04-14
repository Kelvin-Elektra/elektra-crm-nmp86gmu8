import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const stages = [
  { id: 'lead', name: 'Novo Lead', count: 12, color: 'bg-slate-200 text-slate-700' },
  { id: 'contact', name: 'Contato Inicial', count: 8, color: 'bg-blue-100 text-blue-700' },
  { id: 'visit', name: 'Visita Técnica', count: 5, color: 'bg-yellow-100 text-yellow-700' },
  { id: 'proposal', name: 'Proposta Enviada', count: 3, color: 'bg-orange-100 text-orange-700' },
  { id: 'closed', name: 'Fechado Ganho', count: 2, color: 'bg-emerald-100 text-emerald-700' },
]

export default function Pipeline() {
  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pipeline de Vendas</h2>
          <p className="text-muted-foreground">Arraste os cards para avançar as negociações</p>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage.id} className="w-80 shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                {stage.name}
              </h3>
              <Badge variant="secondary">{stage.count}</Badge>
            </div>

            <div className="flex-1 rounded-lg bg-muted/50 p-3 flex flex-col gap-3 border border-border/50">
              {Array.from({ length: stage.count > 3 ? 3 : stage.count }).map((_, i) => (
                <Card
                  key={i}
                  className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm"
                >
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm font-medium flex justify-between">
                      <span>Sistema {stage.id === 'closed' ? '10kWp' : '5kWp'}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        R$ {(Math.random() * 40 + 15).toFixed(1)}k
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                      Cliente Res. Silva Sauro
                    </p>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${stage.color}`}
                    >
                      {stage.name}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
