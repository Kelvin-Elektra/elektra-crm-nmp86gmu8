import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { format, subDays, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { MetricCard } from '@/components/MetricCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, LineChart, Target, Zap, FileSignature, ThumbsUp, Calendar } from 'lucide-react'
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
    let end = new Date()

    if (filter === '30d') start = subDays(end, 30)
    else if (filter === '60d') start = subDays(end, 60)
    else if (filter === '90d') start = subDays(end, 90)
    else {
      const d = parseISO(monthYear + '-01')
      start = startOfMonth(d)
      end = endOfMonth(d)
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
  let end = new Date()
  if (filter === '30d') start = subDays(end, 30)
  else if (filter === '60d') start = subDays(end, 60)
  else if (filter === '90d') start = subDays(end, 90)
  else {
    const d = parseISO(monthYear + '-01')
    start = startOfMonth(d)
    end = endOfMonth(d)
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

  const totalKwp = acceptedProposals.reduce((acc, p) => {
    const neg = p.expand?.negotiation_id
    if (neg?.sizing?.system_power) return acc + Number(neg.sizing.system_power)
    return acc
  }, 0)

  const taxaConversao =
    novasNegociacoes > 0 ? (acceptedProposals.length / novasNegociacoes) * 100 : 0
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          {filter === 'month' && (
            <Input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="w-[160px]"
            />
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
        />
        <MetricCard
          title="Novas Negociações"
          value={novasNegociacoes.toString()}
          icon={LineChart}
          delay={100}
        />
        <MetricCard title="Novos Leads" value={novosLeads.toString()} icon={Target} delay={200} />
        <MetricCard
          title="Potência Vendida"
          value={`${totalKwp.toFixed(2)} kWp`}
          icon={Zap}
          delay={300}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Taxa de Conversão"
          value={`${taxaConversao.toFixed(1)}%`}
          icon={Target}
          delay={400}
        />
        <MetricCard
          title="Ticket Médio (Aprovadas)"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            ticketMedioAprovadas,
          )}
          icon={FileSignature}
          delay={500}
        />
        <MetricCard
          title="Ticket Médio (Feitas)"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            ticketMedioFeitas,
          )}
          icon={FileSignature}
          delay={600}
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
                <span className="font-medium">
                  {novosLeads > 0 ? ((novasNegociacoes / novosLeads) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${novosLeads > 0 ? Math.min((novasNegociacoes / novosLeads) * 100, 100) : 0}%`,
                  }}
                ></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Propostas / Negociações</span>
                <span className="font-medium">
                  {novasNegociacoes > 0
                    ? ((createdProposals.length / novasNegociacoes) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{
                    width: `${novasNegociacoes > 0 ? Math.min((createdProposals.length / novasNegociacoes) * 100, 100) : 0}%`,
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
