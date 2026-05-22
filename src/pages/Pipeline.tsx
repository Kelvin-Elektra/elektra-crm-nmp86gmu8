import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, X, Plus, GripVertical, Tag as TagIcon, Settings2, Filter } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRealtime } from '@/hooks/use-realtime'
import { getPipelineStages, getTags, updateNegotiation } from '@/services/db'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Collections } from '@/lib/pocketbase/collections'
import { cn } from '@/lib/utils'
import { NegotiationSheet } from '@/components/NegotiationSheet'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { TagManager } from '@/components/TagManager'
import { StageManager } from '@/components/StageManager'
import { NewNegotiationDialog } from '@/components/NewNegotiationDialog'

export default function Pipeline() {
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])

  const [search, setSearch] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [stageManagerOpen, setStageManagerOpen] = useState(false)
  const [newNegOpen, setNewNegOpen] = useState(false)

  const { user } = useAuth()
  const { toast } = useToast()

  const loadAll = async () => {
    try {
      const isStandardUser =
        user?.role !== 'User_elektra' &&
        user?.role !== 'User_owner' &&
        user?.role_company !== 'admin'
      const companyFilter =
        user?.role === 'User_elektra' ? '' : `company_id = '${user?.company_id}'`
      const ownerFilter = isStandardUser ? `owner_id = '${user?.id}'` : ''
      const finalFilter = [companyFilter, ownerFilter].filter(Boolean).join(' && ')

      const propOwnerFilter = isStandardUser ? `negotiation_id.owner_id = '${user?.id}'` : ''
      const finalPropFilter = [companyFilter, propOwnerFilter].filter(Boolean).join(' && ')

      const results = await Promise.allSettled([
        pb
          .collection('negotiations')
          .getFullList({ expand: 'lead_id,owner_id', filter: finalFilter }),
        pb.collection('pipeline_stages').getFullList({ filter: companyFilter, sort: 'order' }),
        pb.collection('tags').getFullList({ filter: companyFilter }),
        pb.collection('proposals').getFullList({ filter: finalPropFilter }),
      ])

      const n = results[0].status === 'fulfilled' ? results[0].value : []
      const s = results[1].status === 'fulfilled' ? results[1].value : []
      const t = results[2].status === 'fulfilled' ? results[2].value : []
      const p = results[3].status === 'fulfilled' ? results[3].value : []

      setNegotiations(n)
      setStages(s)
      setTags(t)
      setProposals(p)

      const hasErrors = results.some((r) => r.status === 'rejected')
      if (hasErrors) {
        toast({
          variant: 'destructive',
          title: 'Erro parcial',
          description: 'Alguns dados não puderam ser carregados. Verifique sua conexão.',
        })
      }
    } catch (err) {
      console.error('Error loading pipeline data:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as informações do funil no momento.',
      })
    }
  }

  useEffect(() => {
    loadAll()
  }, [user])
  useRealtime(Collections.NEGOTIATIONS, loadAll)
  useRealtime(Collections.PIPELINE_STAGES, async () => {
    const companyFilter = user?.role === 'User_elektra' ? '' : `company_id = '${user?.company_id}'`
    setStages(
      await pb.collection('pipeline_stages').getFullList({ filter: companyFilter, sort: 'order' }),
    )
  })
  useRealtime(Collections.TAGS, async () => {
    const companyFilter = user?.role === 'User_elektra' ? '' : `company_id = '${user?.company_id}'`
    setTags(await pb.collection('tags').getFullList({ filter: companyFilter }))
  })
  useRealtime(Collections.PROPOSALS, async () => {
    const isStandardUser =
      user?.role !== 'User_elektra' && user?.role !== 'User_owner' && user?.role_company !== 'admin'
    const companyFilter = user?.role === 'User_elektra' ? '' : `company_id = '${user?.company_id}'`
    const propOwnerFilter = isStandardUser ? `negotiation_id.owner_id = '${user?.id}'` : ''
    const finalPropFilter = [companyFilter, propOwnerFilter].filter(Boolean).join(' && ')
    setProposals(await pb.collection('proposals').getFullList({ filter: finalPropFilter }))
  })

  const getNegValue = (negId: string) => {
    const negProps = proposals.filter((p) => p.negotiation_id === negId)
    if (negProps.length === 0) return 0
    const sum = negProps.reduce((acc, p) => acc + (p.total_value || p.price || 0), 0)
    return sum / negProps.length
  }

  const saleStage = stages.find((s) => s.is_sale_stage)

  const getEffectiveStage = (n: any) => {
    if (n.stage === 'Venda Fechada' && saleStage) return saleStage.id
    return n.stage
  }

  const filtered = negotiations.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.expand?.lead_id?.name?.toLowerCase().includes(search.toLowerCase())
    const matchesTags =
      selectedTags.length === 0 || (n.tags || []).some((t: string) => selectedTags.includes(t))
    return matchesSearch && matchesTags
  })

  const toggleColumn = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddTag = async (neg: any, tagId: string) => {
    const negTags = Array.from(new Set([...(neg.tags || []), tagId]))
    setNegotiations((prev) => prev.map((n) => (n.id === neg.id ? { ...n, tags: negTags } : n)))

    try {
      await updateNegotiation(neg.id, { tags: negTags })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar tag',
        description: getErrorMessage(err),
      })
      setNegotiations((prev) => prev.map((n) => (n.id === neg.id ? { ...n, tags: neg.tags } : n)))
    }
  }

  const handleRemoveTag = async (neg: any, tagId: string) => {
    const negTags = (neg.tags || []).filter((t: string) => t !== tagId)
    setNegotiations((prev) => prev.map((n) => (n.id === neg.id ? { ...n, tags: negTags } : n)))

    try {
      await updateNegotiation(neg.id, { tags: negTags })
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover tag',
        description: getErrorMessage(err),
      })
      setNegotiations((prev) => prev.map((n) => (n.id === neg.id ? { ...n, tags: neg.tags } : n)))
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('negotiation_id', id)
  }

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault()
    setDragOverCol(null)
    const id = e.dataTransfer.getData('negotiation_id')
    if (id) {
      const negToMove = negotiations.find((n) => n.id === id)
      if (!negToMove) return

      setNegotiations((prev) => prev.map((n) => (n.id === id ? { ...n, stage: stageId } : n)))

      try {
        await updateNegotiation(id, { stage: stageId })
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Erro ao mover card',
          description: getErrorMessage(err),
        })
        setNegotiations((prev) =>
          prev.map((n) => (n.id === id ? { ...n, stage: negToMove.stage } : n)),
        )
      }
    }
  }

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pipeline de Vendas</h2>
          <p className="text-muted-foreground">Arraste os cards para avançar as negociações</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative w-full max-w-[200px] mr-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Tags</span>
                {selectedTags.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-2 absolute -top-2 -right-2 px-1.5 min-w-[20px] h-5 flex items-center justify-center"
                  >
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filtrar por Tags</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {tags.map((t) => (
                <DropdownMenuCheckboxItem
                  key={t.id}
                  checked={selectedTags.includes(t.id)}
                  onCheckedChange={(c) => {
                    if (c) setSelectedTags([...selectedTags, t.id])
                    else setSelectedTags(selectedTags.filter((id) => id !== t.id))
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.color }}
                    ></div>
                    {t.name}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
              {tags.length === 0 && (
                <div className="p-2 text-xs text-muted-foreground text-center">
                  Nenhuma tag cadastrada
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Settings2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ajustes</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setStageManagerOpen(true)}
                className="cursor-pointer"
              >
                <Settings2 className="h-4 w-4 mr-2" /> Funil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTagManagerOpen(true)} className="cursor-pointer">
                <TagIcon className="h-4 w-4 mr-2" /> Tags
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => setNewNegOpen(true)}
            className="bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4 sm:mr-2" />{' '}
            <span className="hidden sm:inline">Nova Negociação</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start">
        {stages.map((stage) => {
          const isCollapsed = collapsed.has(stage.id)
          const colNegs = filtered.filter((n) => getEffectiveStage(n) === stage.id)
          const colTotal = colNegs.reduce((acc, n) => acc + getNegValue(n.id), 0)

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

              <div className="flex-1 bg-muted/40 p-2 rounded-lg flex flex-col gap-3 overflow-y-auto border border-border/50 min-h-[100px]">
                {colNegs.map((neg) => {
                  const val = getNegValue(neg.id)
                  return (
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
                      <CardContent className="p-3 pt-0 flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <p className="text-muted-foreground line-clamp-1">
                            {neg.expand?.lead_id?.name || 'Sem lead vinculado'}
                          </p>
                          {val > 0 && (
                            <span className="font-semibold text-primary shrink-0">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                maximumFractionDigits: 0,
                              }).format(val)}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mt-2">
                          {(neg.tags || []).map((tagId: string) => {
                            const tagObj = tags.find((t) => t.id === tagId)
                            if (!tagObj) {
                              return (
                                <Badge
                                  key={tagId}
                                  variant="outline"
                                  className="text-[10px] pr-1 h-5 flex items-center gap-1 bg-background/50"
                                >
                                  {tagId}
                                  <X
                                    className="h-3 w-3 cursor-pointer hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRemoveTag(neg, tagId)
                                    }}
                                  />
                                </Badge>
                              )
                            }
                            return (
                              <Badge
                                key={tagId}
                                style={{
                                  backgroundColor: tagObj.color + '20',
                                  color: tagObj.color,
                                  borderColor: tagObj.color + '40',
                                }}
                                className="text-[10px] pr-1 h-5 flex items-center gap-1"
                              >
                                {tagObj.name}
                                <X
                                  className="h-3 w-3 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveTag(neg, tagId)
                                  }}
                                />
                              </Badge>
                            )
                          })}
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
                            <PopoverContent
                              className="w-48 p-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {tags.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center p-2">
                                  Nenhuma tag criada.
                                </p>
                              ) : (
                                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                                  {tags.map((t) => (
                                    <div
                                      key={t.id}
                                      className="flex items-center gap-2 text-xs p-1.5 hover:bg-muted cursor-pointer rounded"
                                      onClick={() => handleAddTag(neg, t.id)}
                                    >
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: t.color }}
                                      ></div>
                                      {t.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>

              <div className="bg-muted/40 border border-border/50 rounded-lg p-3 flex justify-between items-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total
                </span>
                <span className="text-sm font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    colTotal,
                  )}
                </span>
              </div>
            </div>
          )
        })}
        {stages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-xl h-64">
            <Settings2 className="h-8 w-8 mb-4 opacity-50" />
            <p>Nenhum estágio configurado.</p>
            <Button variant="link" onClick={() => setStageManagerOpen(true)}>
              Configurar Funil
            </Button>
          </div>
        )}
      </div>

      <NegotiationSheet
        negotiation={negotiations.find((n) => n.id === selectedId)}
        open={!!selectedId}
        onOpenChange={(o: boolean) => !o && setSelectedId(null)}
      />

      <TagManager open={tagManagerOpen} onOpenChange={setTagManagerOpen} />
      <StageManager open={stageManagerOpen} onOpenChange={setStageManagerOpen} />
      <NewNegotiationDialog open={newNegOpen} onOpenChange={setNewNegOpen} />
    </div>
  )
}
