import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, MapPin, Zap, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function Negotiations() {
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])

  const load = async () => {
    try {
      const records = await pb.collection('negotiations').getFullList({
        expand: 'lead_id,owner_id',
        sort: '-created',
      })
      setNegotiations(records)
    } catch (err) {
      console.error(err)
    }
  }

  const loadStages = async () => {
    try {
      const records = await pb.collection('pipeline_stages').getFullList({
        sort: 'order',
      })
      setStages(records)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    load()
    loadStages()
  }, [])

  useRealtime('negotiations', load)
  useRealtime('pipeline_stages', loadStages)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Todas as Negociações</h2>
          <p className="text-muted-foreground">
            Visão geral em lista das suas propostas comerciais
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {negotiations.map((neg) => (
          <Card key={neg.id} className="hover:border-primary/50 transition-colors border-border/50">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700 uppercase">
                  {stages.find((s) => s.id === neg.stage)?.name || neg.stage}
                </span>
              </div>
              <h3 className="font-bold text-lg mb-1 line-clamp-1">{neg.title}</h3>

              <div className="flex flex-col gap-1 mb-4">
                <p className="text-sm text-muted-foreground flex items-center">
                  <User className="h-4 w-4 mr-1" /> Lead:{' '}
                  {neg.expand?.lead_id?.name || 'Desconhecido'}
                </p>
                <p className="text-xs text-muted-foreground flex items-center">
                  <Briefcase className="h-3 w-3 mr-1" /> Resp:{' '}
                  {neg.expand?.owner_id?.name || 'Não atribuído'}
                </p>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Zap className="h-4 w-4 mr-2" /> Consumo: {neg.avg_consumption} kWh
                </div>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-2" /> {neg.address || 'Sem endereço'}
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1 text-xs" size="sm" asChild>
                  <Link to={`/negociacoes/${neg.id}`}>Ver Detalhes</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {negotiations.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            Nenhuma negociação encontrada.
          </div>
        )}
      </div>
    </div>
  )
}
