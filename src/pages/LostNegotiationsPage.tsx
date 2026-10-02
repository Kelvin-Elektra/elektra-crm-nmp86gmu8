import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Filter,
  AlertOctagon,
  Calendar,
  User,
  DollarSign,
  ArrowUpDown,
  RotateCcw,
  ExternalLink,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { WhatsAppContactButton } from '@/components/WhatsAppContactButton'
import { DEFAULT_LOSS_REASONS } from '@/components/MarkNegotiationLostDialog'

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export function LostNegotiationsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [negotiations, setNegotiations] = useState<any[]>([])
  const [stages, setStages] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])

  const [search, setSearch] = useState('')
  const [selectedReason, setSelectedReason] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [selectedConsultant, setSelectedConsultant] = useState<string>('all')

  const isAdmin =
    user?.role === 'User_elektra' || user?.role === 'User_owner' || user?.role_company === 'admin'

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const companyFilter = user?.role === 'User_elektra' ? '' : `company_id='${user?.company_id}'`
      const ownerFilter = !isAdmin ? `owner_id='${user?.id}'` : ''
      const finalNegFilter = [companyFilter, ownerFilter].filter(Boolean).join(' && ')

      const [negRes, stagesRes, propRes] = await Promise.all([
        pb.collection('negotiations').getFullList({
          filter: finalNegFilter,
          sort: '-updated',
          expand: 'lead_id,owner_id,stage',
        }),
        pb.collection('pipeline_stages').getFullList({
          filter: companyFilter,
          sort: 'order',
        }),
        pb.collection('proposals').getFullList({
          filter: companyFilter,
        }),
      ])

      setStages(stagesRes)
      setProposals(propRes)

      // Identifica estágios de perda
      const lossStageIds = stagesRes
        .filter(
          (s) =>
            s.is_loss_stage ||
            s.name.toLowerCase().includes('perd') ||
            s.name.toLowerCase().includes('cancelad'),
        )
        .map((s) => s.id)

      // Filtra apenas as perdidas
      const lostNegs = negRes.filter((n) => {
        return Boolean(n.lost_at) || Boolean(n.loss_reason) || lossStageIds.includes(n.stage)
      })

      setNegotiations(lostNegs)
    } catch (err: any) {
      console.error('Erro ao carregar negociações perdidas:', err)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: err?.message || 'Falha ao buscar negociações perdidas.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  // Valor da negociação (baseado nas propostas ou sizing)
  const getNegValue = (negId: string) => {
    const negProps = proposals.filter((p) => p.negotiation_id === negId)
    if (negProps.length === 0) return 0
    const sum = negProps.reduce((acc, p) => acc + (p.total_value || p.price || 0), 0)
    return sum / negProps.length
  }

  // Lista única de consultores para o filtro (visível para admins)
  const uniqueConsultants = useMemo(() => {
    const map = new Map<string, string>()
    negotiations.forEach((n) => {
      const cId = n.owner_id
      const cName = n.expand?.owner_id?.name || n.consultant_name || 'Não atribuído'
      if (cId) map.set(cId, cName)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [negotiations])

  // Filtros combinados
  const filteredNegotiations = useMemo(() => {
    const now = Date.now()

    return negotiations.filter((neg) => {
      // Busca textual
      const matchesSearch =
        neg.title?.toLowerCase().includes(search.toLowerCase()) ||
        neg.expand?.lead_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
        neg.loss_reason?.toLowerCase().includes(search.toLowerCase()) ||
        neg.loss_notes?.toLowerCase().includes(search.toLowerCase())

      if (!matchesSearch) return false

      // Motivo
      if (selectedReason !== 'all') {
        if (selectedReason === '__other__') {
          if (DEFAULT_LOSS_REASONS.includes(neg.loss_reason)) return false
        } else if (neg.loss_reason !== selectedReason) {
          return false
        }
      }

      // Consultor (apenas admin filtra)
      if (isAdmin && selectedConsultant !== 'all') {
        if (neg.owner_id !== selectedConsultant) return false
      }

      // Período
      if (selectedPeriod !== 'all') {
        const lossDate = new Date(neg.lost_at || neg.updated).getTime()
        if (isNaN(lossDate)) return true

        const diffDays = (now - lossDate) / (1000 * 60 * 60 * 24)
        if (selectedPeriod === '7d' && diffDays > 7) return false
        if (selectedPeriod === '30d' && diffDays > 30) return false
        if (selectedPeriod === '90d' && diffDays > 90) return false
        if (selectedPeriod === 'year' && diffDays > 365) return false
      }

      return true
    })
  }, [negotiations, search, selectedReason, selectedPeriod, selectedConsultant, isAdmin])

  // Compilado agregado dos motivos de perda
  const lossReasonStats = useMemo(() => {
    const countMap: Record<string, { count: number; value: number }> = {}

    negotiations.forEach((n) => {
      const reason = n.loss_reason || 'Motivo não informado'
      const val = getNegValue(n.id)
      if (!countMap[reason]) {
        countMap[reason] = { count: 0, value: 0 }
      }
      countMap[reason].count += 1
      countMap[reason].value += val
    })

    return Object.entries(countMap)
      .map(([reason, stats]) => ({
        reason,
        count: stats.count,
        value: stats.value,
        percent:
          negotiations.length > 0 ? Math.round((stats.count / negotiations.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
  }, [negotiations, proposals])

  const totalLostValue = filteredNegotiations.reduce((acc, n) => acc + getNegValue(n.id), 0)

  // Reativar negociação: mover de volta para o primeiro estágio ativo
  const handleReactivate = async (neg: any) => {
    const firstActiveStage = stages.find(
      (s) => !s.is_loss_stage && !s.name.toLowerCase().includes('perd'),
    )
    if (!firstActiveStage) {
      toast({ variant: 'destructive', title: 'Nenhum estágio ativo encontrado no funil' })
      return
    }

    try {
      await pb.collection('negotiations').update(neg.id, {
        stage: firstActiveStage.id,
        lost_at: null,
        loss_reason: null,
        loss_notes: null,
        stage_changed_at: new Date().toISOString(),
      })

      toast({
        title: 'Negociação reativada',
        description: `A negociação foi movida de volta para o estágio "${firstActiveStage.name}".`,
      })
      loadData()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao reativar',
        description: err?.message || 'Falha ao reativar negociação.',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-rose-600" />
            Negociações Perdidas
          </h2>
          <p className="text-muted-foreground text-sm">
            Consolidado de oportunidades não convertidas para análise de motivos e histórico de
            clientes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/negociacoes')}>
            Voltar ao Pipeline
          </Button>
        </div>
      </div>

      {/* Cards de Resumo e Compilado de Motivos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total de Negociações Perdidas</span>
              <AlertOctagon className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-foreground">{filteredNegotiations.length}</div>
            <p className="text-xs text-muted-foreground">Volume total arquivado da empresa</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Valor Total Oportunidades</span>
              <DollarSign className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-600">{BRL.format(totalLostValue)}</div>
            <p className="text-xs text-muted-foreground">Estimativa das propostas vinculadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Principal Motivo Identificado</span>
              <Calendar className="w-4 h-4 text-amber-500" />
            </div>
            <div
              className="text-lg font-bold text-foreground truncate"
              title={lossReasonStats[0]?.reason}
            >
              {lossReasonStats[0]?.reason || 'Nenhum registro'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lossReasonStats[0] ? `${lossReasonStats[0].percent}% dos casos registrados` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Compilado Visual dos Motivos de Perda */}
      {lossReasonStats.length > 0 && (
        <Card className="bg-card/70 border-border/70">
          <CardHeader className="pb-3 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Compilado de Motivos de Perda (Consolidado)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 pb-4">
            {lossReasonStats.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">{item.reason}</span>
                  <span className="text-muted-foreground">
                    {item.count} negociações ({item.percent}%) • {BRL.format(item.value)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-rose-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filtros da Listagem */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, título ou anotações..."
            className="pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por Motivo */}
          <Select value={selectedReason} onValueChange={setSelectedReason}>
            <SelectTrigger className="w-[180px] text-xs h-9">
              <SelectValue placeholder="Motivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os motivos</SelectItem>
              {DEFAULT_LOSS_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
              <SelectItem value="__other__">Outros</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por Período */}
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[140px] text-xs h-9">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="year">Último ano</SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por Consultor (Admin) */}
          {isAdmin && uniqueConsultants.length > 0 && (
            <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
              <SelectTrigger className="w-[160px] text-xs h-9">
                <SelectValue placeholder="Consultor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os consultores</SelectItem>
                {uniqueConsultants.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Tabela de Negociações Perdidas */}
      <div className="bg-card rounded-xl border overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : filteredNegotiations.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-2">
            <AlertOctagon className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="font-medium text-base">Nenhuma negociação perdida encontrada</p>
            <p className="text-xs">
              {negotiations.length === 0
                ? 'Seu funil não possui negociações marcadas como perda.'
                : 'Nenhum resultado para os filtros selecionados.'}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-semibold text-xs">Cliente / Oportunidade</TableHead>
                <TableHead className="font-semibold text-xs">Motivo da Perda</TableHead>
                <TableHead className="font-semibold text-xs">Valor Estimado</TableHead>
                <TableHead className="font-semibold text-xs">Data da Perda</TableHead>
                <TableHead className="font-semibold text-xs">Consultor</TableHead>
                <TableHead className="font-semibold text-xs text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y">
              {filteredNegotiations.map((neg) => {
                const val = getNegValue(neg.id)
                const phone = neg.expand?.lead_id?.phone
                const leadName = neg.expand?.lead_id?.name || neg.lead_name || 'Sem nome'
                const consultantName =
                  neg.expand?.owner_id?.name || neg.consultant_name || 'Não atribuído'
                const lossDate = neg.lost_at || neg.updated

                return (
                  <TableRow key={neg.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="font-medium text-sm text-foreground flex items-center gap-2">
                        <span>{neg.title}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span>{leadName}</span>
                        {phone && (
                          <WhatsAppContactButton
                            phone={phone}
                            clientName={leadName}
                            size="icon"
                            variant="ghost"
                            showLabel={false}
                            className="h-6 w-6"
                          />
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 font-medium text-xs"
                      >
                        {neg.loss_reason || 'Não informado'}
                      </Badge>
                      {neg.loss_notes && (
                        <p
                          className="text-xs text-muted-foreground mt-1 line-clamp-1 italic"
                          title={neg.loss_notes}
                        >
                          "{neg.loss_notes}"
                        </p>
                      )}
                    </TableCell>

                    <TableCell className="font-semibold text-sm">
                      {val > 0 ? BRL.format(val) : '—'}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {lossDate ? new Date(lossDate).toLocaleDateString('pt-BR') : '—'}
                    </TableCell>

                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <User className="w-3.5 h-3.5" />
                        <span>{consultantName}</span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/negociacoes/${neg.id}`)}
                          className="h-8 text-xs gap-1"
                          title="Abrir detalhes da negociação"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Detalhes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReactivate(neg)}
                          className="h-8 text-xs gap-1 border-primary/40 hover:bg-primary/10"
                          title="Mover de volta para o funil ativo"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reativar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
