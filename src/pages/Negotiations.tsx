import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Briefcase,
  MapPin,
  Zap,
  User,
  Search,
  LayoutGrid,
  List as ListIcon,
  Trash2,
  Eye,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { deleteNegotiation } from '@/services/db'
import { useAuth } from '@/contexts/AuthContext'
import { NewNegotiationDialog } from '@/components/NewNegotiationDialog'

export default function Negotiations() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [newNegOpen, setNewNegOpen] = useState(false)
  const [stages, setStages] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    try {
      setIsLoading(true)
      const filter = user?.role === 'user' ? `owner_id = '${user?.id}'` : ''
      const records = await pb.collection('negotiations').getFullList({
        expand: 'lead_id,owner_id',
        sort: '-created',
        filter,
      })
      setNegotiations(records)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
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

  const handleDelete = async (id: string) => {
    try {
      await deleteNegotiation(id)
      toast({ title: 'Sucesso', description: 'Negociação excluída com sucesso.' })
      load()
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível excluir a negociação.',
      })
    }
  }

  const filtered = negotiations.filter((n) => {
    const term = search.toLowerCase()
    return (
      n.title.toLowerCase().includes(term) ||
      n.expand?.lead_id?.name?.toLowerCase().includes(term) ||
      n.expand?.lead_id?.document?.includes(term)
    )
  })

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Negociações</h2>
          <p className="text-muted-foreground">Gerencie todas as suas propostas comerciais</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button onClick={() => setNewNegOpen(true)} className="w-full sm:w-auto">
            Nova Negociação
          </Button>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou lead..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-muted rounded-md p-1">
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView('list')}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading && view === 'list' ? (
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Consumo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell className="text-right flex justify-end gap-2">
                    <Skeleton className="h-8 w-8" />
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : isLoading && view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex flex-col border-border/50">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4 mb-4" />
                <div className="space-y-2 mb-6">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="flex gap-2 w-full mt-auto">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border-2 border-dashed rounded-xl">
          Nenhuma negociação encontrada com os filtros atuais.
        </div>
      ) : view === 'list' ? (
        <div className="rounded-md border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Consumo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((neg) => (
                <TableRow key={neg.id} className="group">
                  <TableCell className="font-medium">{neg.title}</TableCell>
                  <TableCell>{neg.expand?.lead_id?.name || 'Sem Lead'}</TableCell>
                  <TableCell>{neg.expand?.owner_id?.name || 'Não atribuído'}</TableCell>
                  <TableCell>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {stages.find((s) => s.id === neg.stage)?.name || neg.stage}
                    </span>
                  </TableCell>
                  <TableCell>{neg.avg_consumption ? `${neg.avg_consumption} kWh` : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/negociacoes/${neg.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir negociação?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Isso removerá permanentemente a
                              negociação
                              <strong> {neg.title}</strong> e todos os dados vinculados a ela.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(neg.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((neg) => (
            <Card
              key={neg.id}
              className="hover:border-primary/50 transition-colors border-border/50 flex flex-col"
            >
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700 uppercase">
                    {stages.find((s) => s.id === neg.stage)?.name || neg.stage}
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-1 line-clamp-1">{neg.title}</h3>

                <div className="flex flex-col gap-1 mb-4 flex-1">
                  <p className="text-sm text-muted-foreground flex items-center">
                    <User className="h-4 w-4 mr-1 shrink-0" />{' '}
                    <span className="line-clamp-1">
                      {neg.expand?.lead_id?.name || 'Desconhecido'}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <Briefcase className="h-3 w-3 mr-1 shrink-0" />{' '}
                    <span className="line-clamp-1">
                      {neg.expand?.owner_id?.name || 'Não atribuído'}
                    </span>
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Zap className="h-4 w-4 mr-2" /> Consumo: {neg.avg_consumption} kWh
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />{' '}
                    <span className="line-clamp-1">{neg.address || 'Sem endereço'}</span>
                  </div>
                </div>

                <div className="flex gap-2 w-full mt-auto">
                  <Button variant="outline" className="flex-1 text-xs" size="sm" asChild>
                    <Link to={`/negociacoes/${neg.id}`}>Ver Detalhes</Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir negociação?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso removerá permanentemente a
                          negociação.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(neg.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <NewNegotiationDialog open={newNegOpen} onOpenChange={setNewNegOpen} onSuccess={load} />
    </div>
  )
}
