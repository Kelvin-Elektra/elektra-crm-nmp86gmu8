import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  parseISO,
  startOfDay,
  endOfDay,
  addYears,
  subYears,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { ChevronLeft, ChevronRight, CalendarIcon, Terminal, Copy } from 'lucide-react'
import { MetricCard } from '@/components/MetricCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  LineChart,
  Target,
  Zap,
  FileSignature,
  ThumbsUp,
  Calendar,
  Download,
  Info,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { generateDashboardPDF } from '@/lib/pdf-generator'
import { useToast } from '@/hooks/use-toast'

export default function Dashboard() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tokenPayload, setTokenPayload] = useState<any>(null)

  useEffect(() => {
    if (pb.authStore.token) {
      try {
        const payload = JSON.parse(atob(pb.authStore.token.split('.')[1]))
        setTokenPayload(payload)
      } catch (e) {
        // ignore
      }
    }
  }, [])
  const [filter, setFilter] = useState('30d')
  const [monthYear, setMonthYear] = useState(format(new Date(), 'yyyy-MM'))
  const [users, setUsers] = useState<any[]>([])

  const [pickerDate, setPickerDate] = useState(new Date())

  const [data, setData] = useState({
    proposals: [] as any[],
    leads: [] as any[],
    negotiations: [] as any[],
  })

  const isSuper = user?.role === 'User_elektra'
  const isCompanyAdmin = user?.role_company === 'admin' || user?.role === 'User_owner'

  const loadUsers = async () => {
    try {
      const res = await pb.collection('users').getFullList()
      setUsers(res)
    } catch {
      /* intentionally ignored */
    }
  }

  const loadData = async () => {
    let start: Date
    let end = endOfDay(new Date())

    if (filter === '30d') start = startOfDay(subDays(end, 30))
    else if (filter === '60d') start = startOfDay(subDays(end, 60))
    else if (filter === '90d') start = startOfDay(subDays(end, 90))
    else {
      const [year, month] = monthYear.split('-').map(Number)
      const d = new Date(year, month - 1, 1)
      start = startOfMonth(d)
      end = endOfDay(endOfMonth(d))
    }

    const startStr = start.toISOString()
    const endStr = end.toISOString()

    try {
      const companyId = user?.company_id || ''
      const uFilter = isSuper ? '' : `company_id = '${companyId}'`
      const tFilter = `created >= '${startStr}' && created <= '${endStr}'`
      const qn = [uFilter, tFilter].filter(Boolean).join(' && ')

      const propUFilter = isSuper ? '' : `company_id = '${companyId}'`
      const pTimeFilter = `(created >= '${startStr}' && created <= '${endStr}') || (closing_date >= '${startStr}' && closing_date <= '${endStr}')`
      const qp = [propUFilter, pTimeFilter].filter(Boolean).join(' && ')

      const [p, l, n] = await Promise.all([
        pb.collection('proposals').getFullList({ expand: 'negotiation_id', filter: qp }),
        pb.collection('leads').getFullList({ filter: qn }),
        pb.collection('negotiations').getFullList({ filter: qn }),
      ])

      setData({ proposals: p, leads: l, negotiations: n })
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  useEffect(() => {
    if (user) loadData()
  }, [filter, monthYear, user])

  useRealtime('proposals', loadData)
  useRealtime('leads', loadData)
  useRealtime('negotiations', loadData)

  let start: Date
  let end = endOfDay(new Date())
  if (filter === '30d') start = startOfDay(subDays(end, 30))
  else if (filter === '60d') start = startOfDay(subDays(end, 60))
  else if (filter === '90d') start = startOfDay(subDays(end, 90))
  else {
    const [year, month] = monthYear.split('-').map(Number)
    const d = new Date(year, month - 1, 1)
    start = startOfMonth(d)
    end = endOfDay(endOfMonth(d))
  }

  const isOwner = (item: any) => {
    if (isSuper || isCompanyAdmin) return true
    if (
      item.collectionId === pb.collection('proposals').collectionId ||
      item.expand?.negotiation_id
    ) {
      return item.expand?.negotiation_id?.owner_id === user?.id
    }
    return item.owner_id === user?.id
  }

  const inPeriod = (dateStr: string) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    return d >= start && d <= end
  }

  const filteredProposals = data.proposals.filter(isOwner)
  const filteredLeads = data.leads.filter(isOwner)
  const filteredNegotiations = data.negotiations.filter(isOwner)

  const createdProposals = filteredProposals.filter((p) => inPeriod(p.created))
  const acceptedProposals = filteredProposals.filter(
    (p) => p.status === 'accepted' && inPeriod(p.closing_date || p.updated),
  )

  const vendasFechadas = acceptedProposals.reduce(
    (acc, p) => acc + (p.total_value || p.price || 0),
    0,
  )
  const novosLeads = filteredLeads.filter((l) => inPeriod(l.created)).length
  const novasNegociacoes = filteredNegotiations.filter((n) => inPeriod(n.created)).length

  const wonNegsIds = Array.from(new Set(acceptedProposals.map((p) => p.negotiation_id)))
  const wonNegs = wonNegsIds
    .map((id) => acceptedProposals.find((p) => p.negotiation_id === id)?.expand?.negotiation_id)
    .filter(Boolean)

  const getSnapshotPower = (snapshot: any) => {
    if (!snapshot) return 0
    let parsed = snapshot
    if (typeof snapshot === 'string') {
      try {
        parsed = JSON.parse(snapshot)
      } catch {
        return 0
      }
    }
    let power = parsed?.sizing?.totalPower ?? parsed?.sizing?.kit_power_kwp
    if (typeof power === 'string') {
      power = power.replace(',', '.')
    }
    return Number(power) || 0
  }

  const totalKwp = acceptedProposals.reduce(
    (acc, prop) => acc + getSnapshotPower(prop.snapshot_data),
    0,
  )

  const wonNegsCount = wonNegsIds.length
  const taxaConversao = novasNegociacoes > 0 ? (wonNegsCount / novasNegociacoes) * 100 : 0
  const aproveitamento = novosLeads > 0 ? (novasNegociacoes / novosLeads) * 100 : 0
  const propNegRatio = novasNegociacoes > 0 ? createdProposals.length / novasNegociacoes : 0

  const ticketMedioFeitas =
    createdProposals.length > 0
      ? createdProposals.reduce((a, p) => a + (p.total_value || p.price || 0), 0) /
        createdProposals.length
      : 0
  const ticketMedioAprovadas =
    acceptedProposals.length > 0 ? vendasFechadas / acceptedProposals.length : 0

  const getUserName = (id: string) => users.find((u) => u.id === id)?.name || 'Usuário'

  const activities = [
    ...createdProposals.map((p) => ({
      id: p.id + 'c',
      type: 'proposal',
      date: p.created,
      title: 'Proposta Gerada',
      user: p.expand?.negotiation_id?.owner_id,
      val: p.total_value || p.price,
    })),
    ...acceptedProposals.map((p) => ({
      id: p.id + 'a',
      type: 'sale',
      date: p.closing_date || p.updated,
      title: 'Venda Fechada',
      user: p.expand?.negotiation_id?.owner_id,
      val: p.total_value || p.price,
    })),
    ...filteredLeads.map((l) => ({
      id: l.id,
      type: 'lead',
      date: l.created,
      title: `Novo Lead: ${l.name}`,
      user: l.owner_id,
      val: 0,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 15)

  const generateReport = () => {
    const salesList = acceptedProposals.map((p) => {
      const power = getSnapshotPower(p.snapshot_data)
      const val = p.total_value || p.price || 0
      const title = p.expand?.negotiation_id?.title || 'Negociação'
      return {
        title,
        date: format(new Date(p.closing_date || p.updated), 'dd/MM/yyyy'),
        power: `${power.toFixed(2)} kWp`,
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val),
      }
    })

    const reportData = {
      period: filter === 'month' ? monthYear : filter,
      vendasFechadas: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        vendasFechadas,
      ),
      novasNegociacoes: novasNegociacoes.toString(),
      novosLeads: novosLeads.toString(),
      totalKwp: `${totalKwp.toFixed(2)} kWp`,
      taxaConversao: `${taxaConversao.toFixed(1)}%`,
      aproveitamento: `${aproveitamento.toFixed(1)}%`,
      propNegRatio: propNegRatio.toFixed(1),
      ticketMedioAprovadas: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(ticketMedioAprovadas),
      ticketMedioFeitas: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(ticketMedioFeitas),
      sales: salesList,
    }

    const blob = generateDashboardPDF(reportData)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${new Date().toISOString().split('T')[0]}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
      {user && (
        <Alert className="bg-secondary/30 border-secondary">
          <Terminal className="h-4 w-4" />
          <AlertTitle className="flex justify-between items-center">
            <span>Debug Session Info</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(pb.authStore.token)
                toast({
                  title: 'Token copiado',
                  description: 'O Access Token foi copiado para a área de transferência.',
                })
              }}
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy Debug Info
            </Button>
          </AlertTitle>
          <AlertDescription className="mt-4 flex flex-col gap-2 font-mono text-sm overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-semibold font-sans text-muted-foreground mr-2">User ID:</span>
                {user.id}
              </div>
              <div>
                <span className="font-semibold font-sans text-muted-foreground mr-2">
                  Company ID:
                </span>
                {user.company_id || 'Nenhum'}
              </div>
              <div>
                <span className="font-semibold font-sans text-muted-foreground mr-2">Role:</span>
                {user.role || 'Nenhum'}
              </div>
              <div>
                <span className="font-semibold font-sans text-muted-foreground mr-2">
                  Company Role:
                </span>
                {user.role_company || 'Nenhum'}
              </div>
            </div>
            {tokenPayload && (
              <div className="mt-2">
                <span className="font-semibold font-sans text-muted-foreground block mb-1">
                  Decoded Token Payload:
                </span>
                <pre className="bg-background p-2 rounded border text-xs overflow-x-auto">
                  {JSON.stringify(tokenPayload, null, 2)}
                </pre>
              </div>
            )}
            <div className="mt-2 text-xs">
              <span className="font-semibold font-sans text-muted-foreground mr-2">Context:</span>
              Route: {window.location.pathname} | Env: {import.meta.env.MODE}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          {filter === 'month' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="capitalize">
                    {format(
                      new Date(
                        Number(monthYear.split('-')[0]),
                        Number(monthYear.split('-')[1]) - 1,
                        1,
                      ),
                      'MMMM yyyy',
                      { locale: ptBR },
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPickerDate(subYears(pickerDate, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="font-semibold">{format(pickerDate, 'yyyy')}</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPickerDate(addYears(pickerDate, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const d = new Date(pickerDate.getFullYear(), i, 1)
                    return (
                      <Button
                        key={i}
                        variant={monthYear === format(d, 'yyyy-MM') ? 'default' : 'ghost'}
                        onClick={() => setMonthYear(format(d, 'yyyy-MM'))}
                        className="capitalize"
                      >
                        {format(d, 'MMM', { locale: ptBR })}
                      </Button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="60d">Últimos 60 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="month">Mês/Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="hidden sm:flex" onClick={generateReport}>
            <Download className="w-4 h-4 mr-2" />
            Gerar Relatório
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Vendas Fechadas"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            vendasFechadas,
          )}
          icon={DollarSign}
          delay={0}
          tooltip="Soma do valor de todas as propostas com status aceito no período."
        />
        <MetricCard
          title="Novas Negociações"
          value={novasNegociacoes.toString()}
          icon={LineChart}
          delay={100}
          tooltip="Total de negociações criadas no período."
        />
        <MetricCard
          title="Novos Leads"
          value={novosLeads.toString()}
          icon={Target}
          delay={200}
          tooltip="Total de leads cadastrados no período."
        />
        <MetricCard
          title="Potência Vendida"
          value={`${totalKwp.toFixed(2)} kWp`}
          icon={Zap}
          delay={300}
          tooltip="Soma da potência (kWp) dos sistemas vendidos (negociações com propostas aceitas) no período."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Taxa de Conversão"
          value={`${taxaConversao.toFixed(1)}%`}
          icon={Target}
          delay={400}
          tooltip="Percentual de negociações criadas que resultaram em uma venda fechada no período selecionado."
        />
        <MetricCard
          title="Ticket Médio (Aprovadas)"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            ticketMedioAprovadas,
          )}
          icon={FileSignature}
          delay={500}
          tooltip="Valor médio das vendas fechadas no período."
        />
        <MetricCard
          title="Ticket Médio (Propostas Feitas)"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            ticketMedioFeitas,
          )}
          icon={FileSignature}
          delay={600}
          tooltip="Valor médio de todas as propostas geradas no período."
        />
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up"
        style={{ animationDelay: '700ms' }}
      >
        <Card className="col-span-1 lg:col-span-2 border-border/50 hover-lift">
          <CardHeader>
            <CardTitle>Atividade Recente</CardTitle>
            <CardDescription>Acompanhe o que está acontecendo no seu funil</CardDescription>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground">
                Nenhuma atividade no período.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-full flex items-center justify-center',
                          act.type === 'sale'
                            ? 'bg-green-100 text-green-600'
                            : act.type === 'proposal'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-primary/10 text-primary',
                        )}
                      >
                        {act.type === 'sale' ? (
                          <ThumbsUp className="h-5 w-5" />
                        ) : act.type === 'proposal' ? (
                          <FileSignature className="h-5 w-5" />
                        ) : (
                          <Target className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{act.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {getUserName(act.user)} - {format(new Date(act.date), 'dd/MM/yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    {act.val > 0 && (
                      <div
                        className={cn(
                          'font-semibold text-sm',
                          act.type === 'sale' ? 'text-green-600' : '',
                        )}
                      >
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(act.val)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 border-border/50 hover-lift">
          <CardHeader>
            <CardTitle>Métricas de Sucesso</CardTitle>
            <CardDescription>Resumo do período filtrado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span>Aproveitamento de Leads</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[200px] text-xs text-center">
                        Percentual de leads que avançaram para a fase de negociação.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-medium">{aproveitamento.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(aproveitamento, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span>Propostas / Negociações</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[200px] text-xs text-center">
                        Média de propostas geradas para cada negociação aberta.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-medium">{propNegRatio.toFixed(1)}</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${Math.min((propNegRatio / 5) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <span>Taxa de Fechamento</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[200px] text-xs text-center">
                        Percentual de negociações convertidas em vendas (propostas aceitas).
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <span className="font-medium">{taxaConversao.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${Math.min(taxaConversao, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-4">
              <p className="text-xs text-muted-foreground text-center">
                Todos os dados apresentados são baseados na data de criação dos registros e no
                período selecionado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
