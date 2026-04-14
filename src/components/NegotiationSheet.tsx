import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { getNegotiation } from '@/services/db'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Zap, MapPin, User, Building } from 'lucide-react'

export function NegotiationSheet({
  negotiationId,
  negotiation: initialNeg,
  open,
  onOpenChange,
}: any) {
  const [negotiation, setNegotiation] = useState<any>(initialNeg || null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialNeg) {
      setNegotiation(initialNeg)
    } else if (open && negotiationId) {
      setLoading(true)
      getNegotiation(negotiationId)
        .then(setNegotiation)
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      setNegotiation(null)
    }
  }, [open, negotiationId, initialNeg])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{negotiation?.title || 'Detalhes da Negociação'}</SheetTitle>
          <SheetDescription>Resumo dos dados comerciais</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando dados...</div>
        ) : negotiation ? (
          <div className="py-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center text-sm">
                <User className="h-4 w-4 mr-3 text-muted-foreground" />
                <span className="font-medium">
                  {negotiation.expand?.lead_id?.name || 'Cliente desconhecido'}
                </span>
              </div>
              <div className="flex items-center text-sm">
                <Building className="h-4 w-4 mr-3 text-muted-foreground" />
                <span>{negotiation.concessionaire || 'Concessionária não informada'}</span>
              </div>
              <div className="flex items-center text-sm">
                <Zap className="h-4 w-4 mr-3 text-muted-foreground" />
                <span>
                  Consumo Médio: <strong>{negotiation.avg_consumption || 0} kWh</strong>
                </span>
              </div>
              <div className="flex items-start text-sm">
                <MapPin className="h-4 w-4 mr-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">
                  {negotiation.address || 'Endereço não informado'}
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-border mt-6">
              <Button asChild className="w-full">
                <Link to={`/negociacoes/${negotiation.id}`}>Abrir Negociação Completa</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum dado encontrado.
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
