import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { getNegotiation, getProposalsByNeg } from '@/services/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  FileText,
  DollarSign,
  User,
  Zap,
  Sun,
  ShieldCheck,
  TrendingUp,
  ExternalLink,
  Calendar,
  Layers,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { FinancialAnalysisCard } from '@/components/negotiation-tabs/FinancialAnalysisCard'
import { ProposalViewer } from '@/components/ProposalViewer'
import { ProposalEditModal } from '@/components/negotiation-tabs/ProposalEditModal'
import { ProposalCostModal } from '@/components/negotiation-tabs/ProposalCostModal'
import { ProposalHistoryDialog } from '@/components/negotiation-tabs/ProposalHistoryDialog'
import { format } from 'date-fns'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function NegotiationProposalPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [neg, setNeg] = useState<any>(null)
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null)

  // Modais de ação na proposta
  const [viewerOpen, setViewerOpen] = useState<any>(null)
  const [editModalOpen, setEditModalOpen] = useState<any>(null)
  const [costModalOpen, setCostModalOpen] = useState<any>(null)
  const [historyOpen, setHistoryOpen] = useState<any>(null)

  const tabFromUrl = searchParams.get('tab') || 'resumo'
  const [activeTab, setActiveTab] = useState<'resumo' | 'financeiro'>(
    tabFromUrl === 'financeiro' ? 'financeiro' : 'resumo',
  )

  const handleTabChange = (val: string) => {
    setActiveTab(val as 'resumo' | 'financeiro')
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', val)
      return next
    })
  }

  const loadData = async () => {
    if (!id) return
    try {
      const data = await getNegotiation(id)
      setNeg(data)
      const props = await getProposalsByNeg(id)
      props.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime())
      setProposals(props)
      if (props.length > 0 && !selectedProposalId) {
        setSelectedProposalId(props[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])

  useRealtime('negotiations', (e) => {
    if (e.record.id === id) loadData()
  })
  useRealtime('proposals', loadData)

  const isAdmin =
    user?.role === 'User_elektra' || user?.role_company === 'admin' || user?.role === 'User_owner'

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <div className="text-muted-foreground animate-pulse text-sm">
          Carregando proposta da negociação...
        </div>
      </div>
    )
  }

  if (!neg) {
    return <div className="p-8 text-center text-destructive">Negociação não encontrada.</div>
  }

  const activeProposal = proposals.find((p) => p.id === selectedProposalId) || proposals[0] || null

  // Dados do snapshot da proposta ou do dimensionamento da negociação
  const snapshot = activeProposal?.snapshot_data || {}
  const sizing = snapshot.sizing || neg.sizing || {}
  const financial = snapshot.financial || {}
  const lead = neg.expand?.lead_id || snapshot.lead || {}

  const kitPower = Number(sizing.kit_power_kwp || sizing.power_kwp || 0)
  const moduleQty = Number(sizing.module_qty || sizing.module_quantity || 0)
  const avgConsumption = Number(neg.avg_consumption || sizing.avg_consumption || 0)
  const estMonthlyGen = Number(
    sizing.estimated_monthly_generation ||
      sizing.monthly_generation ||
      financial.estimated_monthly_generation ||
      0,
  )
  const monthlySavings = Number(financial.monthly_savings || financial.economy_monthly || 0)
  const proposalTotal = Number(
    activeProposal?.total_value ||
      activeProposal?.price ||
      financial.total_investment ||
      financial.total_value ||
      0,
  )

  const viewUrl = activeProposal?.view_url || snapshot.view_url || null

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in pb-12 w-full">
      {/* Header com navegação de volta */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/negociacoes/${neg.id}`)}
            title="Voltar para a negociação"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">Proposta Comercial</h1>
              <Badge variant="outline" className="text-xs font-mono">
                Negociação: {neg.title}
              </Badge>
              {activeProposal && (
                <Badge
                  variant={
                    activeProposal.status === 'accepted'
                      ? 'default'
                      : activeProposal.status === 'draft'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {activeProposal.status === 'accepted'
                    ? 'Venda Aprovada'
                    : activeProposal.status === 'draft'
                      ? 'Rascunho'
                      : activeProposal.status || 'Gerada'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Cliente:{' '}
              <strong className="text-foreground">
                {lead.name || neg.lead_name || 'Não informado'}
              </strong>
              {lead.city || neg.city
                ? ` • ${lead.city || neg.city}/${lead.state || neg.state || ''}`
                : ''}
              {activeProposal && ` • Proposta #${activeProposal.id.slice(0, 6)}`}
            </p>
          </div>
        </div>

        {/* Ações da Proposta */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewUrl && (
            <Button
              variant="default"
              size="sm"
              onClick={() => window.open(viewUrl, '_blank')}
              className="gap-2 bg-primary shadow-sm"
            >
              <ExternalLink className="h-4 w-4" /> Visualizar Documento Oficial
            </Button>
          )}

          {activeProposal && (
            <Button variant="outline" size="sm" onClick={() => setViewerOpen(activeProposal)}>
              Visualização Interna
            </Button>
          )}

          {activeProposal && isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditModalOpen(activeProposal)}>
                Editar Condições
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCostModalOpen(activeProposal)}>
                Custos
              </Button>
            </>
          )}

          {activeProposal && (
            <Button variant="ghost" size="sm" onClick={() => setHistoryOpen(activeProposal)}>
              Histórico
            </Button>
          )}
        </div>
      </div>

      {/* Se houver mais de uma proposta para a negociação, seletor de proposta */}
      {proposals.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Propostas desta negociação ({proposals.length}):
          </span>
          {proposals.map((p, idx) => (
            <Button
              key={p.id}
              size="sm"
              variant={p.id === activeProposal?.id ? 'secondary' : 'ghost'}
              className="h-8 text-xs font-mono"
              onClick={() => setSelectedProposalId(p.id)}
            >
              #{idx + 1} ({p.id.slice(0, 5)}) - {BRL.format(p.total_value || p.price || 0)}
            </Button>
          ))}
        </div>
      )}

      {/* Abas Dedicadas: Resumo e Financeiro */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-auto p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="resumo" className="py-2.5 rounded-lg data-[state=active]:shadow-sm">
            <FileText className="mr-2 h-4 w-4" /> Resumo da Proposta
          </TabsTrigger>
          <TabsTrigger
            value="financeiro"
            className="py-2.5 rounded-lg data-[state=active]:shadow-sm"
          >
            <TrendingUp className="mr-2 h-4 w-4 text-emerald-600" /> Análise Financeira
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: RESUMO DA PROPOSTA */}
        <TabsContent value="resumo" className="mt-6 space-y-6">
          {/* Status e Link de Visualização Oficial (se existir) */}
          {activeProposal ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">
                      {activeProposal.description || `Proposta #${activeProposal.id}`}
                    </span>
                    <Badge variant="outline" className="text-xs bg-white">
                      Status: {activeProposal.status || 'Gerada'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gerada em {format(new Date(activeProposal.created), 'dd/MM/yyyy HH:mm')}
                    {activeProposal.validity_date && (
                      <>
                        {' '}
                        • Válida até {format(new Date(activeProposal.validity_date), 'dd/MM/yyyy')}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-medium">
                      Valor Total da Proposta
                    </p>
                    <p className="text-2xl font-bold text-primary">{BRL.format(proposalTotal)}</p>
                  </div>
                  {viewUrl && (
                    <Button
                      size="sm"
                      onClick={() => window.open(viewUrl, '_blank')}
                      className="gap-1.5"
                    >
                      <ExternalLink className="h-4 w-4" /> Abrir Documento
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhuma proposta gerada ainda para esta negociação. Você pode analisar os índices
                  financeiros na aba Financeiro e gerar a proposta oficial pelo botão "Gerar
                  Proposta".
                </p>
              </CardContent>
            </Card>
          )}

          {/* Grid de Resumo dos Principais Indicadores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Potência do Sistema</span>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {kitPower.toFixed(2)} <span className="text-sm font-normal">kWp</span>
                </div>
                <p className="text-xs text-muted-foreground">{moduleQty} módulos fotovoltaicos</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Geração Estimada</span>
                  <Sun className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {estMonthlyGen.toFixed(0)} <span className="text-sm font-normal">kWh/mês</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Consumo médio: {avgConsumption} kWh/mês
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Economia na Fatura</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-600">
                  {monthlySavings > 0 ? BRL.format(monthlySavings) : 'Calculando...'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthlySavings > 0
                    ? `${BRL.format(monthlySavings * 12)}/ano`
                    : 'Estimativa mensal'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Valor do Investimento</span>
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-primary">
                  {proposalTotal > 0 ? BRL.format(proposalTotal) : 'A definir'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {activeProposal?.payment_terms || 'Condições comerciais na proposta'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detalhes do Cliente e dos Itens Dimensionados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dados do Cliente / Lead */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" /> Dados do Cliente e Localização
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Cliente / Razão:</span>
                  <span className="font-semibold text-right">
                    {lead.name || neg.lead_name || 'Não informado'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">CPF / CNPJ:</span>
                  <span className="font-mono text-right">
                    {lead.document || lead.cpf_cnpj || 'Não cadastrado'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Telefone / WhatsApp:</span>
                  <span className="text-right">
                    {lead.phone || lead.whatsapp || neg.lead_phone || 'Não informado'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">E-mail:</span>
                  <span className="text-right">
                    {lead.email || neg.lead_email || 'Não informado'}
                  </span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-muted-foreground">Endereço de Instalação:</span>
                  <span className="text-right max-w-[260px] truncate">
                    {lead.street || lead.address
                      ? `${lead.street || lead.address}, ${lead.number || 'S/N'} - ${lead.city || neg.city || ''}/${lead.state || neg.state || ''}`
                      : neg.city || neg.state
                        ? `${neg.city || ''}/${neg.state || ''}`
                        : 'Não informado'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Itens Dimensionados: Painel, Inversor e Estrutura */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" /> Equipamentos do Dimensionamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Módulo Fotovoltaico:</span>
                  <span className="font-medium text-right">
                    {sizing.selected_module_name ||
                      (snapshot.pricing_data?.rawModule
                        ? `${snapshot.pricing_data.rawModule.brand} ${snapshot.pricing_data.rawModule.name || ''}`
                        : `${moduleQty}x Módulos de Alta Eficiência`)}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Quantidade de Painéis:</span>
                  <span className="font-semibold text-right">{moduleQty} unidades</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Inversor(es):</span>
                  <span className="font-medium text-right">
                    {Array.isArray(sizing.inverters) && sizing.inverters.length > 0
                      ? sizing.inverters
                          .map((inv: any) =>
                            `${inv.brand || ''} ${inv.power ? inv.power + 'kW' : ''} (x${inv.qty || 1})`.trim(),
                          )
                          .join(', ')
                      : 'Inversor dimensionado para o kit'}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Tipo de Telhado / Estrutura:</span>
                  <span className="text-right">
                    {sizing.roof_type ||
                      sizing.structure_type ||
                      neg.roof_type ||
                      'Telhado Convencional'}
                  </span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-muted-foreground">Concessionária de Energia:</span>
                  <span className="text-right font-medium">
                    {sizing.concessionaire ||
                      neg.concessionaire ||
                      neg.expand?.utility_id?.name ||
                      'Distribuidora Local'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Se houver equipamentos listados no snapshot, tabela detalhada */}
          {Array.isArray(sizing.equipments) && sizing.equipments.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Lista de Equipamentos e
                    Insumos da Proposta
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {sizing.equipments.length} itens homologados
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Formato compatível com o Gerador de Propostas (chaves: item, specification,
                  quantity, warranty)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-y text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left py-2.5 px-4 font-medium">Item</th>
                      <th className="text-left py-2.5 px-4 font-medium">Especificação</th>
                      <th className="text-center py-2.5 px-4 font-medium w-24">Qtd.</th>
                      <th className="text-right py-2.5 px-4 font-medium w-32">Garantia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {sizing.equipments.map((eq: any, idx: number) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="py-2.5 px-4 font-medium">{eq.item}</td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {eq.specification || eq.especificacao || '-'}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          {eq.quantity || eq.qtd || '1'}
                        </td>
                        <td className="py-2.5 px-4 text-right text-muted-foreground">
                          {eq.warranty || eq.garantia || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ABA 2: FINANCEIRO (ANÁLISE FINANCEIRA E RETORNO DO INVESTIMENTO DEDICADA) */}
        <TabsContent value="financeiro" className="mt-6 space-y-6">
          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Análise Financeira Oficial da
                Proposta
              </h3>
              <p className="text-xs text-emerald-800/80">
                Os cálculos abaixo utilizam a tarifa cadastrada da concessionária e o valor real do
                investimento desta proposta para calcular TIR, Múltiplo de Investimento e Payback.
              </p>
            </div>
            {proposalTotal > 0 && (
              <Badge
                variant="outline"
                className="bg-white border-emerald-300 font-bold text-emerald-800 whitespace-nowrap"
              >
                Base: {BRL.format(proposalTotal)}
              </Badge>
            )}
          </div>

          <FinancialAnalysisCard neg={neg} estMonthlyGen={estMonthlyGen} reload={loadData} />
        </TabsContent>
      </Tabs>

      {/* Modais de visualização e edição */}
      {viewerOpen && (
        <ProposalViewer
          open={!!viewerOpen}
          onOpenChange={(v: boolean) => !v && setViewerOpen(null)}
          proposal={viewerOpen}
          negotiation={neg}
        />
      )}

      {editModalOpen && (
        <ProposalEditModal
          open={!!editModalOpen}
          onOpenChange={(v: boolean) => !v && setEditModalOpen(null)}
          proposal={editModalOpen}
          reload={loadData}
        />
      )}

      {costModalOpen && (
        <ProposalCostModal
          open={!!costModalOpen}
          onOpenChange={(v: boolean) => !v && setCostModalOpen(null)}
          proposal={costModalOpen}
          reload={loadData}
          neg={neg}
        />
      )}

      {historyOpen && (
        <ProposalHistoryDialog
          open={!!historyOpen}
          onOpenChange={(v: boolean) => !v && setHistoryOpen(null)}
          proposalId={historyOpen.id}
        />
      )}
    </div>
  )
}
