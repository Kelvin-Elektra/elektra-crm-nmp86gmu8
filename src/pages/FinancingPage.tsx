import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Calculator,
  Building,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import {
  getFinancingPartners,
  getFinancingCreditLines,
  getFinancingSimulations,
  FinancingPartnerRecord,
  FinancingCreditLineRecord,
  FinancingSimulationRecord,
} from '@/services/financing'
import { calculatePriceSimulation } from '@/lib/price-calculator'

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function FinancingPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [partners, setPartners] = useState<FinancingPartnerRecord[]>([])
  const [creditLines, setCreditLines] = useState<FinancingCreditLineRecord[]>([])
  const [simulations, setSimulations] = useState<FinancingSimulationRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Modais de Criação/Edição
  const [partnerModalOpen, setPartnerModalOpen] = useState(false)
  const [editingPartner, setEditingPartner] = useState<FinancingPartnerRecord | null>(null)
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    partner_type: 'Banco',
    notes: '',
    active: true,
  })

  const [lineModalOpen, setLineModalOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<FinancingCreditLineRecord | null>(null)
  const [lineForm, setLineForm] = useState({
    partner_id: '',
    name: '',
    interest_rate_annual: 15,
    max_installments: 60,
    min_down_payment_percent: 0,
    notes: '',
    active: true,
  })

  // Simulador Rápido integrado na página
  const [simAmount, setSimAmount] = useState<number>(30000)
  const [simDownPayment, setSimDownPayment] = useState<number>(0)
  const [simRateAnnual, setSimRateAnnual] = useState<number>(14.5)
  const [simInstallments, setSimInstallments] = useState<number>(60)

  const quickSimulation = useMemo(() => {
    const financed = Math.max(0, simAmount - simDownPayment)
    return calculatePriceSimulation({
      financedAmount: financed,
      annualRatePct: simRateAnnual,
      installments: simInstallments,
      downPayment: simDownPayment,
      totalNegotiationValue: simAmount,
    })
  }, [simAmount, simDownPayment, simRateAnnual, simInstallments])

  const companyId = user?.company_id

  const loadAll = async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const [pts, lns, sms] = await Promise.all([
        getFinancingPartners(companyId),
        getFinancingCreditLines(companyId),
        getFinancingSimulations(companyId),
      ])
      setPartners(pts)
      setCreditLines(lns)
      setSimulations(sms)
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados de financiamento',
        description: e.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [companyId])

  // --- CRUD PARCEIROS ---
  const handleOpenPartnerModal = (p?: FinancingPartnerRecord) => {
    if (p) {
      setEditingPartner(p)
      setPartnerForm({
        name: p.name,
        partner_type: p.partner_type || 'Banco',
        notes: p.notes || '',
        active: p.active !== false,
      })
    } else {
      setEditingPartner(null)
      setPartnerForm({
        name: '',
        partner_type: 'Banco',
        notes: '',
        active: true,
      })
    }
    setPartnerModalOpen(true)
  }

  const handleSavePartner = async () => {
    if (!companyId || !partnerForm.name.trim()) {
      toast({ variant: 'destructive', title: 'Informe o nome do banco ou parceiro' })
      return
    }

    try {
      if (editingPartner) {
        await pb.collection('financing_partners').update(editingPartner.id, partnerForm)
        toast({ title: 'Parceiro atualizado com sucesso' })
      } else {
        await pb.collection('financing_partners').create({
          ...partnerForm,
          company_id: companyId,
        })
        toast({ title: 'Parceiro cadastrado com sucesso' })
      }
      setPartnerModalOpen(false)
      loadAll()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar parceiro', description: e.message })
    }
  }

  const handleDeletePartner = async (id: string) => {
    if (!confirm('Deseja realmente remover este parceiro e suas linhas de crédito associadas?'))
      return
    try {
      await pb.collection('financing_partners').delete(id)
      toast({ title: 'Parceiro removido com sucesso' })
      loadAll()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir parceiro', description: e.message })
    }
  }

  // --- CRUD LINHAS DE CRÉDITO ---
  const handleOpenLineModal = (l?: FinancingCreditLineRecord, defaultPartnerId?: string) => {
    if (l) {
      setEditingLine(l)
      setLineForm({
        partner_id: l.partner_id,
        name: l.name,
        interest_rate_annual: l.interest_rate_annual,
        max_installments: l.max_installments,
        min_down_payment_percent: l.min_down_payment_percent || 0,
        notes: l.notes || '',
        active: l.active !== false,
      })
    } else {
      setEditingLine(null)
      setLineForm({
        partner_id: defaultPartnerId || (partners[0]?.id ?? ''),
        name: '',
        interest_rate_annual: 15,
        max_installments: 60,
        min_down_payment_percent: 0,
        notes: '',
        active: true,
      })
    }
    setLineModalOpen(true)
  }

  const handleSaveLine = async () => {
    if (!companyId || !lineForm.partner_id || !lineForm.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'Preencha o banco parceiro e o nome da linha de crédito',
      })
      return
    }

    try {
      if (editingLine) {
        await pb.collection('financing_credit_lines').update(editingLine.id, lineForm)
        toast({ title: 'Linha de crédito atualizada' })
      } else {
        await pb.collection('financing_credit_lines').create({
          ...lineForm,
          company_id: companyId,
        })
        toast({ title: 'Linha de crédito cadastrada' })
      }
      setLineModalOpen(false)
      loadAll()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar linha', description: e.message })
    }
  }

  const handleDeleteLine = async (id: string) => {
    if (!confirm('Deseja realmente remover esta linha de crédito?')) return
    try {
      await pb.collection('financing_credit_lines').delete(id)
      toast({ title: 'Linha de crédito removida' })
      loadAll()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir linha', description: e.message })
    }
  }

  // Mini-funil consolidado por banco
  const funnelByPartner = useMemo(() => {
    const map = new Map<
      string,
      {
        partner: FinancingPartnerRecord | null
        partnerName: string
        partnerType: string
        countTotal: number
        valueTotal: number
        countAnalise: number
        valueAnalise: number
        countAprovado: number
        valueAprovado: number
        countRecusado: number
        valueRecusado: number
      }
    >()

    // Inicializa com todos os parceiros cadastrados
    for (const p of partners) {
      map.set(p.id, {
        partner: p,
        partnerName: p.name,
        partnerType: p.partner_type || 'Banco',
        countTotal: 0,
        valueTotal: 0,
        countAnalise: 0,
        valueAnalise: 0,
        countAprovado: 0,
        valueAprovado: 0,
        countRecusado: 0,
        valueRecusado: 0,
      })
    }

    // Consolida as simulações
    for (const sim of simulations) {
      const pid = sim.partner_id
      const entry = map.get(pid) || {
        partner: sim.expand?.partner_id || null,
        partnerName: sim.expand?.partner_id?.name || 'Parceiro',
        partnerType: sim.expand?.partner_id?.partner_type || 'Instituição',
        countTotal: 0,
        valueTotal: 0,
        countAnalise: 0,
        valueAnalise: 0,
        countAprovado: 0,
        valueAprovado: 0,
        countRecusado: 0,
        valueRecusado: 0,
      }

      const val = Number(sim.financed_amount || 0)
      entry.countTotal += 1
      entry.valueTotal += val

      const st = (sim.status || 'Em análise').toLowerCase()
      if (st.includes('aprov')) {
        entry.countAprovado += 1
        entry.valueAprovado += val
      } else if (st.includes('recus')) {
        entry.countRecusado += 1
        entry.valueRecusado += val
      } else {
        entry.countAnalise += 1
        entry.valueAnalise += val
      }

      map.set(pid, entry)
    }

    return Array.from(map.values()).sort((a, b) => b.valueTotal - a.valueTotal)
  }, [partners, simulations])

  const totals = useMemo(() => {
    let countTotal = 0
    let valueTotal = 0
    let countAnalise = 0
    let valueAnalise = 0
    let countAprovado = 0
    let valueAprovado = 0
    let countRecusado = 0
    let valueRecusado = 0

    for (const f of funnelByPartner) {
      countTotal += f.countTotal
      valueTotal += f.valueTotal
      countAnalise += f.countAnalise
      valueAnalise += f.valueAnalise
      countAprovado += f.countAprovado
      valueAprovado += f.valueAprovado
      countRecusado += f.countRecusado
      valueRecusado += f.valueRecusado
    }

    return {
      countTotal,
      valueTotal,
      countAnalise,
      valueAnalise,
      countAprovado,
      valueAprovado,
      countRecusado,
      valueRecusado,
    }
  }, [funnelByPartner])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in pb-16 w-full">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-primary" /> Financiamento Solar
          </h2>
          <p className="text-sm text-muted-foreground">
            Gestão de parceiros bancários, linhas de crédito, simulador Price e acompanhamento de
            propostas em análise.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => handleOpenPartnerModal()} className="gap-2">
            <Plus className="w-4 h-4" /> Novo Banco / Parceiro
          </Button>
        </div>
      </div>

      {/* KPI Cards: Visão Geral do Funil de Financiamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Total Financiado</span>
              <Layers className="w-4 h-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">{BRL(totals.valueTotal)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {totals.countTotal} proposta(s) com banco vinculado
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Em Análise</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {BRL(totals.valueAnalise)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {totals.countAnalise} proposta(s) aguardando parecer
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Aprovados</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {BRL(totals.valueAprovado)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {totals.countAprovado} crédito(s) liberado(s)
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between">
              <span>Recusados</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {BRL(totals.valueRecusado)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {totals.countRecusado} proposta(s) reprovada(s)
          </CardContent>
        </Card>
      </div>

      {/* Abas Principais: Funil por Banco, Simulador Price e Cadastro de Parceiros */}
      <Tabs defaultValue="funil" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/60">
          <TabsTrigger value="funil" className="gap-2">
            <TrendingUp className="w-4 h-4" /> Funil por Banco
          </TabsTrigger>
          <TabsTrigger value="parceiros" className="gap-2">
            <Building className="w-4 h-4" /> Bancos & Linhas
          </TabsTrigger>
          <TabsTrigger value="simulador" className="gap-2">
            <Calculator className="w-4 h-4" /> Simulador Price
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: FUNIL POR BANCO */}
        <TabsContent value="funil" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Consolidação por Instituição
                Financeira
              </CardTitle>
              <CardDescription>
                Volume total negociado e taxa de conversão em cada banco parceiro da companhia.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {funnelByPartner.length === 0 ? (
                <div className="p-12 text-center text-sm text-muted-foreground">
                  Nenhum banco ou simulação cadastrada ainda. Adicione seus parceiros bancários na
                  aba "Bancos & Linhas".
                </div>
              ) : (
                <div className="divide-y">
                  {funnelByPartner.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-base text-foreground">
                            {item.partnerName}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {item.partnerType}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Total de <strong>{item.countTotal}</strong> negociação(ões) vinculada(s)
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3 sm:gap-6 text-right sm:text-left">
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                            Em análise
                          </p>
                          <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                            {item.countAnalise} ({BRL(item.valueAnalise)})
                          </p>
                        </div>

                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30">
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                            Aprovado
                          </p>
                          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                            {item.countAprovado} ({BRL(item.valueAprovado)})
                          </p>
                        </div>

                        <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30">
                          <p className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                            Recusado
                          </p>
                          <p className="text-sm font-bold text-rose-800 dark:text-rose-200">
                            {item.countRecusado} ({BRL(item.valueRecusado)})
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista detalhada das simulações ativas */}
          {simulations.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" /> Últimas Propostas com
                  Financiamento
                </CardTitle>
                <CardDescription>
                  Negociações em andamento vinculadas a uma linha de financiamento.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y text-sm">
                  {simulations.slice(0, 10).map((sim) => {
                    const neg = sim.expand?.negotiation_id
                    const partner = sim.expand?.partner_id
                    const line = sim.expand?.credit_line_id
                    const st = sim.status || 'Em análise'

                    return (
                      <div
                        key={sim.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              {neg?.title || 'Negociação'}
                            </span>
                            <Badge
                              className={
                                st === 'Aprovado'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'Recusado'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-amber-500 text-white'
                              }
                            >
                              {st}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Banco: <strong>{partner?.name || '—'}</strong>
                            {line?.name ? ` · Linha: ${line.name}` : ''} · {sim.installments}x de{' '}
                            {BRL(Number(sim.monthly_payment) || 0)}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 justify-between sm:justify-end">
                          <div className="text-right">
                            <p className="font-bold text-foreground">
                              {BRL(Number(sim.financed_amount) || 0)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Total com juros: {BRL(Number(sim.total_paid) || 0)}
                            </p>
                          </div>

                          {neg?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/negociacoes/${neg.id}`)}
                              className="gap-1 text-xs text-primary"
                            >
                              Abrir <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ABA 2: CADASTRO DE BANCOS E LINHAS DE CRÉDITO */}
        <TabsContent value="parceiros" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Bancos e Parceiros de Financiamento</h3>
              <p className="text-xs text-muted-foreground">
                Cadastre taxas de juros anuais, prazos máximos e exigência de entrada por produto de
                crédito.
              </p>
            </div>
            <Button onClick={() => handleOpenPartnerModal()} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Adicionar Banco
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partners.map((partner) => {
              const lines = creditLines.filter((l) => l.partner_id === partner.id)
              return (
                <Card key={partner.id} className="border shadow-sm flex flex-col justify-between">
                  <CardHeader className="pb-3 border-b">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-primary" />
                          <CardTitle className="text-base">{partner.name}</CardTitle>
                        </div>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {partner.partner_type || 'Banco'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenPartnerModal(partner)}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeletePartner(partner.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {partner.notes && (
                      <p className="text-xs text-muted-foreground pt-1">{partner.notes}</p>
                    )}
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Linhas de Crédito ({lines.length})
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1 text-primary"
                        onClick={() => handleOpenLineModal(undefined, partner.id)}
                      >
                        <Plus className="w-3 h-3" /> Nova Linha
                      </Button>
                    </div>

                    {lines.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed text-center text-xs text-muted-foreground">
                        Nenhuma linha cadastrada para este banco. Clique em "Nova Linha" acima.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {lines.map((line) => (
                          <div
                            key={line.id}
                            className="p-2.5 rounded-lg border bg-muted/30 flex items-center justify-between text-xs"
                          >
                            <div>
                              <p className="font-semibold text-foreground">{line.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                Taxa: <strong>{line.interest_rate_annual}% a.a.</strong> · Prazo:
                                até <strong>{line.max_installments} meses</strong>
                                {line.min_down_payment_percent
                                  ? ` · Entrada mín.: ${line.min_down_payment_percent}%`
                                  : ''}
                              </p>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleOpenLineModal(line)}
                              >
                                <Edit2 className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => handleDeleteLine(line.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ABA 3: SIMULADOR PRICE RÁPIDO */}
        <TabsContent value="simulador" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" /> Calculadora de Parcela Fixa (Tabela
                Price)
              </CardTitle>
              <CardDescription>
                Simule qualquer valor de financiamento instantaneamente com juros compostos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Valor do Projeto (R$)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="500"
                    value={simAmount}
                    onChange={(e) => setSimAmount(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Entrada (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="500"
                    value={simDownPayment}
                    onChange={(e) => setSimDownPayment(Number(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Taxa Anual (% a.a.)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={simRateAnnual}
                    onChange={(e) => setSimRateAnnual(Number(e.target.value) || 0)}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    ~{quickSimulation.monthlyRatePct}% ao mês
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Prazo em Meses</Label>
                  <Input
                    type="number"
                    min="1"
                    max="240"
                    value={simInstallments}
                    onChange={(e) => setSimInstallments(Number(e.target.value) || 1)}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {(simInstallments / 12).toFixed(1)} ano(s)
                  </span>
                </div>
              </div>

              {/* Resultado */}
              <div className="p-6 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center sm:text-left">
                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-xs text-muted-foreground mb-1">Valor a Financiar</p>
                    <p className="text-2xl font-bold text-foreground">
                      {BRL(quickSimulation.financedAmount)}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-xs text-muted-foreground mb-1">Parcela Mensal (PMT)</p>
                    <p className="text-2xl font-bold text-primary">
                      {BRL(quickSimulation.monthlyPayment)}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-xs text-muted-foreground mb-1">Total Financiado Pago</p>
                    <p className="text-2xl font-bold text-foreground">
                      {BRL(quickSimulation.totalFinancedPaid)}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-background border">
                    <p className="text-xs text-muted-foreground mb-1">Custo Total de Juros</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {BRL(quickSimulation.totalInterest)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-primary/20 text-xs text-muted-foreground">
                  <span>
                    Fórmula oficial Price: parcelas uniformes com amortização crescente e juros
                    decrescentes.
                  </span>
                  <span>
                    Total geral (com entrada de {BRL(quickSimulation.downPayment)}):{' '}
                    <strong className="text-foreground">{BRL(quickSimulation.totalPaid)}</strong>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: CRIAR / EDITAR BANCO PARCEIRO */}
      <Dialog open={partnerModalOpen} onOpenChange={setPartnerModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPartner ? 'Editar Banco / Parceiro' : 'Novo Banco / Parceiro'}
            </DialogTitle>
            <DialogDescription>
              Cadastre a instituição financeira parceira para simulações e linhas de crédito.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Instituição *</Label>
              <Input
                placeholder="Ex: Santander Solar, Sicredi, Banco do Brasil, Solfácil..."
                value={partnerForm.name}
                onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Parceiro</Label>
              <Select
                value={partnerForm.partner_type}
                onValueChange={(val) => setPartnerForm({ ...partnerForm, partner_type: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Banco">Banco Comercial / Múltiplo</SelectItem>
                  <SelectItem value="Cooperativa">Cooperativa de Crédito</SelectItem>
                  <SelectItem value="Fintech">Fintech de Energia Solar</SelectItem>
                  <SelectItem value="Outro">Outra Instituição</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observações / Contato do Gerente (Opcional)</Label>
              <Input
                placeholder="Ex: Gerente fulano, telefone, portal do correspondente..."
                value={partnerForm.notes}
                onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnerModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePartner}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CRIAR / EDITAR LINHA DE CRÉDITO */}
      <Dialog open={lineModalOpen} onOpenChange={setLineModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLine ? 'Editar Linha de Crédito' : 'Nova Linha de Crédito'}
            </DialogTitle>
            <DialogDescription>
              Configure o nome do produto, taxa anual, prazo máximo e exigência de entrada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Banco / Parceiro *</Label>
              <Select
                value={lineForm.partner_id}
                onValueChange={(val) => setLineForm({ ...lineForm, partner_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {partners.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome da Linha / Produto *</Label>
              <Input
                placeholder="Ex: Financiamento Solar PF, Linha Rural, CDC Sustentável..."
                value={lineForm.name}
                onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Taxa de Juros (% a.a.) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={lineForm.interest_rate_annual}
                  onChange={(e) =>
                    setLineForm({
                      ...lineForm,
                      interest_rate_annual: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Prazo Máximo (Meses) *</Label>
                <Input
                  type="number"
                  min="1"
                  max="240"
                  value={lineForm.max_installments}
                  onChange={(e) =>
                    setLineForm({
                      ...lineForm,
                      max_installments: Number(e.target.value) || 1,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Entrada Mínima (% do valor)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                placeholder="0"
                value={lineForm.min_down_payment_percent}
                onChange={(e) =>
                  setLineForm({
                    ...lineForm,
                    min_down_payment_percent: Number(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observações do Produto (Opcional)</Label>
              <Input
                placeholder="Ex: Carência de até 90 dias para primeira parcela..."
                value={lineForm.notes}
                onChange={(e) => setLineForm({ ...lineForm, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLineModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveLine}>Salvar Linha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
