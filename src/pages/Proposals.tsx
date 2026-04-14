import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Download, Send, Eye } from 'lucide-react'

export default function Proposals() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Propostas Comerciais</h2>
          <p className="text-muted-foreground">Gerador e histórico de propostas</p>
        </div>
        <Button>Gerar Nova Proposta</Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[1, 2, 3].map((i) => (
          <Card
            key={i}
            className="flex flex-col sm:flex-row items-center justify-between p-2 hover:bg-muted/30 transition-colors border-border/50"
          >
            <div className="flex items-center gap-4 p-4">
              <div className="h-12 w-12 bg-secondary rounded-lg flex items-center justify-center text-secondary-foreground shrink-0">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-base">Proposta Comercial #2026-{245 + i}</CardTitle>
                <CardDescription>Residência {i} • Sistema On-Grid • R$ 35.000,00</CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 w-full sm:w-auto justify-end">
              <Button variant="ghost" size="icon" title="Visualizar">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" title="Baixar PDF">
                <Download className="h-4 w-4" />
              </Button>
              <Button size="sm" className="ml-2">
                <Send className="h-4 w-4 mr-2" /> Enviar p/ Cliente
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
