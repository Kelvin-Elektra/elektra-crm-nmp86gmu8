import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, Calendar, MapPin, DollarSign } from 'lucide-react'

export default function Negotiations() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Negociações Ativas</h2>
          <p className="text-muted-foreground">Acompanhe as propostas em andamento</p>
        </div>
        <Button>Nova Negociação</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="hover-lift border-border/50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  Em Análise
                </span>
              </div>
              <h3 className="font-bold text-lg mb-1">Projeto Residencial {i}0kWp</h3>
              <p className="text-sm text-muted-foreground mb-4">Cliente Família Souza</p>

              <div className="space-y-2 mb-6">
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" /> São Paulo, SP
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4 mr-2" /> Valor: R$ {i * 12}.500,00
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-2" /> Previsão: 30/{i + 4}/2026
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1 text-xs" size="sm">
                  Detalhes
                </Button>
                <Button className="flex-1 text-xs" size="sm">
                  Avançar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
