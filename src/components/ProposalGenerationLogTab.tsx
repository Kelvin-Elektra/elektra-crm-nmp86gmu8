import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  FileText,
  Calendar,
  ExternalLink,
  Copy,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Eye,
  Building,
  User,
  ShieldAlert,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ProposalGenerationLogTabProps {
  proposals: any[]
  loading: boolean
  onRefresh?: () => void
  selectedCompanyId?: string
  companies?: any[]
}

export const ProposalGenerationLogTab: React.FC<ProposalGenerationLogTabProps> = ({
  proposals,
  loading,
  selectedCompanyId,
  companies = [],
}) => {
  const { toast } = useToast()
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Auto-selecionar a primeira proposta se nenhuma estiver selecionada
  React.useEffect(() => {
    if (proposals.length > 0 && !selectedProposalId) {
      setSelectedProposalId(proposals[0].id)
    }
  }, [proposals, selectedProposalId])

  // Filtrar propostas pelo search e empresa se aplicável
  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      // Filtro de empresa se estiver ativo
      if (selectedCompanyId && selectedCompanyId !== 'all' && p.company_id !== selectedCompanyId) {
        return false
      }
      // Filtro de status
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const clientName = (
        p.expand?.negotiation_id?.expand?.lead_id?.name ||
        p.snapshot_data?.lead?.name ||
        p.description ||
        ''
      ).toLowerCase()
      const id = (p.id || '').toLowerCase()
      const template = (
        p.snapshot_data?.template_id ||
        p.snapshot_data?.generator_template_id ||
        p.snapshot_data?.template ||
        ''
      ).toLowerCase()
      return clientName.includes(q) || id.includes(q) || template.includes(q)
    })
  }, [proposals, selectedCompanyId, statusFilter, searchQuery])

  // Proposta selecionada no painel lateral
  const selectedProposal = useMemo(() => {
    return proposals.find((p) => p.id === selectedProposalId) || filteredProposals[0] || null
  }, [proposals, selectedProposalId, filteredProposals])

  // Extrair snapshot e relatório de resolução
  const snapshot = selectedProposal?.snapshot_data || {}
  const resolutionReport = snapshot.resolution_report as
    | Record<string, { category?: string; field?: string; matchType?: string; value?: any }>
    | undefined
  const hasResolutionReport =
    resolutionReport &&
    typeof resolutionReport === 'object' &&
    Object.keys(resolutionReport).length > 0

  const dynamicPayload = snapshot.dynamic as Record<string, any> | undefined
  const hasDynamicPayload =
    dynamicPayload && typeof dynamicPayload === 'object' && Object.keys(dynamicPayload).length > 0

  // Copiar payload enviado (JSON) com fallback e toast
  const handleCopyPayload = async () => {
    if (!selectedProposal) return

    const exportPayload = {
      proposal_id: selectedProposal.id,
      created: selectedProposal.created,
      client:
        selectedProposal.expand?.negotiation_id?.expand?.lead_id?.name ||
        snapshot.lead?.name ||
        'Não informado',
      template_id: snapshot.template_id || snapshot.generator_template_id || snapshot.template,
      external_id: selectedProposal.external_id || selectedProposal.id,
      view_url: selectedProposal.view_url,
      total_value: selectedProposal.total_value || selectedProposal.price,
      payload_snapshot: {
        lead: snapshot.lead,
        negotiation: snapshot.negotiation,
        sizing: snapshot.sizing,
        financial: snapshot.financial,
        dynamic: snapshot.dynamic,
        fixed_data: snapshot.fixed_data || snapshot.branding,
        resolution_report: snapshot.resolution_report,
        unresolved_report: snapshot.unresolved_report,
        manual_mappings: snapshot.manual_mappings,
      },
    }

    const jsonStr = JSON.stringify(exportPayload, null, 2)
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(jsonStr)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = jsonStr
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        textArea.remove()
      }
      toast({
        title: 'Copiado!',
        description: `Payload real da proposta ${selectedProposal.id} copiado para a área de transferência.`,
      })
    } catch (err) {
      console.error('Falha ao copiar payload:', err)
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o payload para a área de transferência.',
        variant: 'destructive',
      })
    }
  }

  // Renderizador de badge de origem
  const renderOriginBadge = (origin?: string, matchType?: string) => {
    const orig = (origin || '').toLowerCase()
    const match = (matchType || '').toLowerCase()

    if (orig === 'manual' || match === 'manual_override') {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1 font-medium text-[11px]"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Manual
        </Badge>
      )
    }

    if (match === 'exact' || orig === 'exact') {
      return (
        <Badge
          variant="outline"
          className="bg-cyan-50 text-cyan-700 border-cyan-300 gap-1 font-medium text-[11px]"
        >
          <Sparkles className="w-3 h-3 text-cyan-600" /> Exata
        </Badge>
      )
    }

    // Semântica / Automática
    return (
      <Badge
        variant="outline"
        className="bg-blue-50 text-blue-700 border-blue-300 gap-1 font-medium text-[11px]"
      >
        <Sparkles className="w-3 h-3 text-blue-600" /> Semântica
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Log de Auditoria e Geração de Propostas
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Histórico das propostas geradas pelo Gerador de Propostas, status de resolução das
            variáveis dinâmicas e payloads oficiais transmitidos.
          </p>
        </div>

        {selectedProposal && (
          <Button
            onClick={handleCopyPayload}
            variant="outline"
            className="gap-1.5 text-xs h-9 border-slate-300 hover:bg-slate-50 shrink-0"
            title="Copia o snapshot/payload real enviado para o Gerador"
          >
            <Copy className="h-3.5 w-3.5 text-slate-600" />
            Copiar payload enviado (JSON)
          </Button>
        )}
      </div>

      {/* Grid: Lista de Propostas (Esquerda) e Painel de Detalhes da Proposta (Direita) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lista de Propostas */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>Histórico de Propostas</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {filteredProposals.length}
                    </Badge>
                  </CardTitle>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Buscar por cliente, ID ou modelo..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="sent">Enviada</SelectItem>
                      <SelectItem value="accepted">Aceita</SelectItem>
                      <SelectItem value="rejected">Recusada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[640px] overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                  Carregando propostas...
                </div>
              ) : filteredProposals.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Nenhuma proposta gerada encontrada com os filtros aplicados.
                </div>
              ) : (
                filteredProposals.map((prop) => {
                  const isSelected = prop.id === selectedProposal?.id
                  const clientName =
                    prop.expand?.negotiation_id?.expand?.lead_id?.name ||
                    prop.snapshot_data?.lead?.name ||
                    prop.description ||
                    'Cliente não identificado'
                  const templateName =
                    prop.snapshot_data?.template_id ||
                    prop.snapshot_data?.generator_template_id ||
                    prop.snapshot_data?.template ||
                    'Modelo padrão'
                  const createdDate = prop.created
                    ? new Date(prop.created).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Data desconhecida'

                  return (
                    <div
                      key={prop.id}
                      onClick={() => setSelectedProposalId(prop.id)}
                      className={`p-3.5 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                          : 'hover:bg-slate-50 border-l-4 border-l-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-slate-900 truncate">
                            {clientName}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Modelo:{' '}
                            <span className="font-medium text-slate-700">{templateName}</span>
                          </p>
                        </div>
                        <Badge
                          variant={prop.status === 'accepted' ? 'default' : 'outline'}
                          className="text-[10px] uppercase font-mono px-1.5 py-0 shrink-0"
                        >
                          {prop.status || 'draft'}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3" /> {createdDate}
                        </span>
                        <span className="font-mono text-slate-600">ID: {prop.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detalhe da Proposta Selecionada */}
        <div className="lg:col-span-7 space-y-4">
          {selectedProposal ? (
            <Card>
              <CardHeader className="pb-3 border-b">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>Auditoria da Proposta</span>
                      <code className="text-xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono">
                        {selectedProposal.id}
                      </code>
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Cliente:{' '}
                      <strong className="text-slate-800">
                        {selectedProposal.expand?.negotiation_id?.expand?.lead_id?.name ||
                          snapshot.lead?.name ||
                          'Não identificado'}
                      </strong>{' '}
                      · Gerada em:{' '}
                      {selectedProposal.created
                        ? new Date(selectedProposal.created).toLocaleString('pt-BR')
                        : '—'}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedProposal.view_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(selectedProposal.view_url, '_blank')}
                        className="gap-1.5 text-xs h-8 text-blue-600 hover:text-blue-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver Proposta
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPayload}
                      className="gap-1.5 text-xs h-8"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copiar JSON
                    </Button>
                  </div>
                </div>

                {/* Info Bar resumida */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 mt-2 border-t text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Modelo / Template</span>
                    <span className="font-medium text-slate-700">
                      {snapshot.template_id ||
                        snapshot.generator_template_id ||
                        snapshot.template ||
                        '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Valor Total</span>
                    <span className="font-semibold text-emerald-700">
                      {selectedProposal.total_value
                        ? new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(selectedProposal.total_value)
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Potência do Kit</span>
                    <span className="font-medium text-slate-700">
                      {snapshot.sizing?.kit_power_kwp
                        ? `${snapshot.sizing.kit_power_kwp} kWp`
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Status Auditoria</span>
                    <span className="font-medium">
                      {hasResolutionReport ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Auditada
                        </span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Legada
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {/* Se não houver resolution_report gravado no snapshot_data */}
                {!hasResolutionReport && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                      <ShieldAlert className="h-4 w-4 text-amber-600" />
                      <span>
                        Relatório de resolução indisponível nesta proposta (gerada antes da
                        auditoria)
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Esta proposta foi criada em uma versão anterior do sistema antes da
                      persistência do relatório de resolução (resolution_report). Exibindo abaixo os
                      dados do bloco dinâmico (dynamic) gravados no snapshot, se disponíveis.
                    </p>
                  </div>
                )}

                {/* Tabela de Variáveis Dinâmicas */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Variáveis Dinâmicas Enviadas ao Gerador
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {hasResolutionReport
                        ? `${Object.keys(resolutionReport || {}).length} variáveis mapeadas`
                        : hasDynamicPayload
                          ? `${Object.keys(dynamicPayload || {}).length} variáveis no payload`
                          : '0 variáveis'}
                    </span>
                  </div>

                  <div className="border rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 border-b text-slate-700 font-semibold">
                          <th className="py-2.5 px-3 w-[35%]">Key do Gerador</th>
                          <th className="py-2.5 px-3 w-[25%]">Origem</th>
                          <th className="py-2.5 px-3 w-[25%]">Valor Enviado</th>
                          <th className="py-2.5 px-3 w-[15%] text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {hasResolutionReport ? (
                          Object.entries(resolutionReport || {}).map(([key, item]) => {
                            const val = item?.value
                            const hasValue =
                              val !== undefined && val !== null && String(val).trim() !== ''

                            return (
                              <tr key={key} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                                  {key}
                                  {item?.field && (
                                    <span className="block text-[10px] font-normal text-slate-400">
                                      {item.category}.{item.field}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  {renderOriginBadge(item?.category, item?.matchType)}
                                </td>
                                <td className="py-2.5 px-3">
                                  {hasValue ? (
                                    <span
                                      className="font-mono text-slate-800 truncate block max-w-[160px]"
                                      title={String(val)}
                                    >
                                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">vazio</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {hasValue ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0"
                                    >
                                      Preenchido
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0"
                                    >
                                      Vazio
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        ) : hasDynamicPayload ? (
                          Object.entries(dynamicPayload || {}).map(([key, val]) => {
                            const hasValue =
                              val !== undefined && val !== null && String(val).trim() !== ''

                            return (
                              <tr key={key} className="hover:bg-slate-50/80">
                                <td className="py-2.5 px-3 font-mono font-medium text-slate-900">
                                  {key}
                                </td>
                                <td className="py-2.5 px-3">
                                  <Badge
                                    variant="outline"
                                    className="bg-slate-100 text-slate-700 border-slate-300 text-[10px]"
                                  >
                                    Payload dinâmico
                                  </Badge>
                                </td>
                                <td className="py-2.5 px-3">
                                  {hasValue ? (
                                    <span
                                      className="font-mono text-slate-800 truncate block max-w-[160px]"
                                      title={String(val)}
                                    >
                                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">vazio</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {hasValue ? (
                                    <Badge
                                      variant="outline"
                                      className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0"
                                    >
                                      Preenchido
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0"
                                    >
                                      Vazio
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            )
                          })
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                              Nenhuma variável dinâmica registrada no snapshot desta proposta.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Visualizador de Raw JSON colapsável para depuração técnica rápida */}
                <div className="pt-2">
                  <details className="group border rounded-lg bg-slate-50 p-3 text-xs">
                    <summary className="font-semibold cursor-pointer text-slate-700 flex items-center justify-between">
                      <span>Visualizar Snapshot JSON Completo</span>
                      <span className="text-slate-400 group-open:rotate-180 transition-transform">
                        ▼
                      </span>
                    </summary>
                    <pre className="mt-3 bg-slate-950 text-slate-200 p-3 rounded font-mono text-[11px] overflow-x-auto max-h-64">
                      {JSON.stringify(snapshot, null, 2)}
                    </pre>
                  </details>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-12 text-center border rounded-xl bg-slate-50 text-slate-400 text-xs">
              Selecione uma proposta da lista ao lado para inspecionar os detalhes da auditoria.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProposalGenerationLogTab
