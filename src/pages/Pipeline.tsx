import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, X, Plus, GripVertical } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useRealtime } from '@/hooks/use-realtime'
import { getNegotiations, updateNegotiation } from '@/services/db'
import { cn } from '@/lib/utils'
import { NegotiationSheet } from '@/components/NegotiationSheet'

const STAGES = [
  { id: 'lead', name: 'Novo Lead', color: 'bg-slate-200 text-slate-700' },
  { id: 'contact', name: 'Contato Inicial', color: 'bg-blue-100 text-blue-700' },
  { id: 'visit', name: 'Visita Técnica', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'proposal', name: 'Proposta Enviada', color: 'bg-orange-100 text-orange-700' },
  { id: 'closed', name: 'Fechado Ganho', color: 'bg-emerald-100 text-emerald-700' },
]

export default function Pipeline() {
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const load = async () => setNegotiations(await getNegotiations())
  useEffect(() => {
    load()
  }, [])
  useRealtime('negotiations', load)

  const filtered = negotiations.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.expand?.lead_id?.name?.toLowerCase().includes(search.toLowerCase()),
  )

  const toggleColumn = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddTag = async (neg: any, tag: string) => {
    if (!tag.trim()) return
    const tags = Array.from(new Set([...(neg.tags || []), tag.trim()]))
    setNegotiations((prev) => prev.map((n) => (n.id === neg.id ? { ...n, tags } : n)))
    await updateNegotiation(neg.id, { tags })
  }

  const handleRemoveTag = async (neg: any, tag: string) => {
    const tags = (neg.tags || []).filter((t: string) => t !== tag)
    setNegotiations((prev) => prev.map((n) => (n.id === neg.id ? { ...n, tags } : n)))
    await updateNegotiation(neg.id, { tags })
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('negotiation_id', id)
  }

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    setDragOverCol(null)
    const id = e.dataTransfer.getData('negotiation_id')
    if (id) {
      setNegotiations((prev) => prev.map((n) => (n.id === id ? { ...n, stage: stageId } : n)))
      await updateNegotiation(id, { stage: stageId })
    }
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pipeline de Vendas</h2>
          <p className="text-muted-foreground">Arraste os cards para avançar as negociações</p>
        </div>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar negociação ou lead..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start">
        {STAGES.map((stage) => {
          const isCollapsed = collapsed.has(stage.id)
          const colNegs = filtered.filter((n) => n.stage === stage.id)

          if (isCollapsed) {
            return (
              <div
                key={stage.id}
                className="w-12 shrink-0 bg-muted/50 h-[calc(100vh-14rem)] rounded-xl border border-border/50 flex flex-col items-center py-6 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => toggleColumn(stage.id)}
              >
                <span className="[writing-mode:vertical-lr] font-semibold text-muted-foreground tracking-widest uppercase text-xs">
                  {stage.name}
                </span>
                <Badge variant="secondary" className="mt-4">
                  {colNegs.length}
                </Badge>
              </div>
            )
          }

          return (
            <div
              key={stage.id}
              className={cn(
                'w-80 shrink-0 flex flex-col gap-3 h-[calc(100vh-14rem)] transition-colors rounded-xl p-2',
                dragOverCol === stage.id
                  ? 'bg-primary/5 border border-primary/30'
                  : 'bg-transparent',
              )}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverCol(stage.id)
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div
                className="flex items-center justify-between px-2 cursor-pointer group"
                onClick={() => toggleColumn(stage.id)}
              >
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
                  {stage.name}
                </h3>
                <Badge variant="secondary">{colNegs.length}</Badge>
              </div>

              <div className="flex-1 bg-muted/40 p-2 rounded-lg flex flex-col gap-3 overflow-y-auto border border-border/50">
                {colNegs.map((neg) => (
                  <Card
                    key={neg.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, neg.id)}
                    onClick={() => setSelectedId(neg.id)}
                    className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm animate-fade-in group relative"
                  >
                    <GripVertical className="absolute right-2 top-3 h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                    <CardHeader className="p-3 pb-2 pr-8">
                      <CardTitle className="text-sm font-medium line-clamp-1" title={neg.title}>
                        {neg.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {neg.expand?.lead_id?.name || 'Sem lead vinculado'}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-2">
                        {(neg.tags || []).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-[10px] pr-1 h-5 flex items-center gap-1 bg-background/50"
                          >
                            {tag}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveTag(neg, tag)
                              }}
                            />
                          </Badge>
                        ))}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 cursor-pointer bg-background/50 hover:bg-muted"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Plus className="h-3 w-3" />
                            </Badge>
                          </PopoverTrigger>
                          <PopoverContent className="w-48 p-2" onClick={(e) => e.stopPropagation()}>
                            <Input
                              placeholder="Adicionar tag... (Enter)"
                              className="h-8 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleAddTag(neg, e.currentTarget.value)
                                  e.currentTarget.value = ''
                                }
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <NegotiationSheet
        negotiation={negotiations.find((n) => n.id === selectedId)}
        open={!!selectedId}
        onOpenChange={(o: boolean) => !o && setSelectedId(null)}
      />
    </div>
  )
}
