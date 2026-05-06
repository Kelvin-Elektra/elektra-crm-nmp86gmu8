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
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react'
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
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export default function Dashboard() {
  const { user } = useAuth()
  const [filter, setFilter] = useState('30d')
  const [monthYear, setMonthYear] = useState(format(new Date(), 'yyyy-MM'))
  const [users, setUsers] = useState<any[]>([])

  const [pickerDate, setPickerDate] = useState(new Date())

  const [data, setData] = useState({
    proposals: [] as any[],
    leads: [] as any[],
    negotiations: [] as any[],
  })

  const isSuper = user?.role === 'admin_elektra'
  const isCompanyAdmin = user?.role === 'admin_company'

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
      const uFilter = isSuper ? '' : `company_id = '${user?.company_id}'`
      const tFilter = `created >= '${startStr}' && created <= '${endStr}'`
      const qn = [uFilter, tFilter].filter(Boolean).join(' && ')

      const propUFilter = isSuper ? '' : `company_id = '${user?.company_id}'`
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

  const totalKwp = wonNegs.reduce((acc, neg) => {
    if (neg?.sizing?.system_power) return acc + Number(neg.sizing.system_power)
    return acc
  }, 0)

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
    const lines = [
      'Relatório de Desempenho - Elektra CRM',
      `Período: ${filter === 'month' ? monthYear : filter}`,
      '',
      `Vendas Fechadas: R$ ${vendasFechadas.toFixed(2)}`,
      `Novas Negociações: ${novasNegociacoes}`,
      `Novos Leads: ${novosLeads}`,
      `Potência Vendida: ${totalKwp.toFixed(2)} kWp`,
      `Taxa de Conversão: ${taxaConversao.toFixed(1)}%`,
      `Aproveitamento de Leads: ${aproveitamento.toFixed(1)}%`,
      `Propostas por Negociação: ${propNegRatio.toFixed(1)}`,
      `Ticket Médio (Aprovadas): R$ ${ticketMedioAprovadas.toFixed(2)}`,
      `Ticket Médio (Propostas Feitas): R$ ${ticketMedioFeitas.toFixed(2)}`,
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6">
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
                <span className="text-muted-foreground">Aproveitamento de Leads</span>
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
                <span className="text-muted-foreground">Propostas / Negociações</span>
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
                <span className="text-muted-foreground">Taxa de Fechamento</span>
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
