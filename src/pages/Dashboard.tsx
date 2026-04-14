import { MetricCard } from '@/components/MetricCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, LineChart, Target, Zap, FileSignature, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Vendas do Mês"
          value="R$ 145.000"
          icon={DollarSign}
          trend="up"
          trendValue="+12.5%"
          delay={0}
        />
        <MetricCard
          title="Vendas da Semana"
          value="R$ 32.500"
          icon={LineChart}
          trend="up"
          trendValue="+4.1%"
          delay={100}
        />
        <MetricCard
          title="Leads Novos"
          value="45"
          icon={Target}
          trend="up"
          trendValue="+18.2%"
          delay={200}
        />
        <MetricCard
          title="Taxa de Conversão"
          value="12.5%"
          icon={Zap}
          trend="down"
          trendValue="-2.1%"
          delay={300}
        />
        <MetricCard
          title="Ticket Médio"
          value="R$ 28.000"
          icon={FileSignature}
          trend="neutral"
          delay={400}
        />
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up"
        style={{ animationDelay: '500ms' }}
      >
        <Card className="col-span-1 lg:col-span-2 border-border/50 hover-lift">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Suas últimas negociações e interações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Proposta Enviada - Sistema 5kWp</p>
                      <p className="text-xs text-muted-foreground">João da Silva - Há 2 horas</p>
                    </div>
                  </div>
                  <div className="font-semibold text-sm">R$ 24.500</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border/50 hover-lift">
          <CardHeader>
            <CardTitle>Próximas Tarefas</CardTitle>
            <CardDescription>Seus compromissos de hoje</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-col p-3 rounded-md bg-secondary/5 border-l-4 border-primary"
              >
                <span className="text-sm font-medium">Visita Técnica - Cliente {i}</span>
                <span className="text-xs text-muted-foreground mt-1">Hoje às 14:00</span>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-4">
              Ver todas as tarefas <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
