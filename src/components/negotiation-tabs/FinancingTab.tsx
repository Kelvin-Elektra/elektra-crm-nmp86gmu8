import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  Calculator,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import {
  getFinancingPartners,
  getFinancingCreditLines,
  getNegotiationFinancingSimulations,
  FinancingPartnerRecord,
  FinancingCreditLineRecord,
  FinancingSimulationRecord,
} from '@/services/financing'
import { calculatePriceSimulation, PriceSimulationResult } from '@/lib/price-calculator'

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

interface FinancingTabProps {
  neg: any
  reload?: () => void
}

export function FinancingTab({ neg, reload }: FinancingTabProps) {
  const { toast } = useToast()
  const [simulations, setSimulations] = useState<FinancingSimulationRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Dados auxiliares para o modal de criação/edição
  const [partners, setPartners] = useState<FinancingPartnerRecord[]>([])
  const [creditLines, setCreditLines] = useState<FinancingCreditLineRecord[]>([])

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('')
  const [selectedLineId, setSelectedLineId] = useState<string>('')
  const [totalValue, setTotalValue] = useState<number>(0)
  const [downPayment, setDownPayment] = useState<number>(0)
  const [annualRate, setAnnualRate] = useState<number>(15)
  const [installments, setInstallments] = useState<number>(60)
  const [status, setStatus] = useState<string>('Em análise')
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const companyId = neg?.company_id

  const loadSimulations = async () => {
    if (!neg?.id) return
    setLoading(true)
    try {
      const list = await getNegotiationFinancingSimulations(neg.id)
      setSimulations(list)
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSimulations()
  }, [neg?.id])

  useEffect(() => {
    if (companyId) {
      Promise.all([getFinancingPartners(companyId), getFinancingCreditLines(companyId)]).then(
        ([pts, lns]) => {
          setPartners(pts.filter((p) => p.active !== false))
          setCreditLines(lns.filter((l) => l.active !== false))
        },
      )
    }
  }, [companyId])

  // Linhas filtradas pelo parceiro selecionado
  const availableLines = useMemo(() => {
    if (!selectedPartnerId) return []
    return creditLines.filter((l) => l.partner_id === selectedPartnerId)
  }, [selectedPartnerId, creditLines])

  // Cálculo Price reativo para a simulação no modal
  const financedAmount = Math.max(0, totalValue - downPayment)
  const simulation: PriceSimulationResult = useMemo(() => {
    return calculatePriceSimulation({
      financedAmount,
      annualRatePct: annualRate,
      installments,
      downPayment,
      totalNegotiationValue: totalValue,
    })
  }, [financedAmount, annualRate, installments, downPayment, totalValue])

  // Sugere valor inicial da proposta/dimensionamento
  const defaultInitialValue = useMemo(() => {
    return Number(neg?.sizing?.total_price || neg?.sizing?.kit_price || 0)
  }, [neg?.sizing])

  const handleOpenCreate = () => {
    setEditingId(null)
    const initialVal = defaultInitialValue > 0 ? defaultInitialValue : 0
    setTotalValue(initialVal)
    setDownPayment(0)
    setStatus('Em análise')
    setNotes('')

    if (partners.length > 0) {
      const firstPartner = partners[0]
      setSelectedPartnerId(firstPartner.id)
      const lines = creditLines.filter((l) => l.partner_id === firstPartner.id)
      if (lines.length > 0) {
        const firstLine = lines[0]
        setSelectedLineId(firstLine.id)
        setAnnualRate(firstLine.interest_rate_annual)
        setInstallments(firstLine.max_installments)
        if (firstLine.min_down_payment_percent && firstLine.min_down_payment_percent > 0) {
          setDownPayment(Math.round((initialVal * firstLine.min_down_payment_percent) / 100))
        }
      } else {
        setSelectedLineId('')
        setAnnualRate(15)
        setInstallments(60)
      }
    } else {
      setSelectedPartnerId('')
      setSelectedLineId('')
      setAnnualRate(15)
      setInstallments(60)
    }

    setModalOpen(true)
  }

  const handleOpenEdit = (sim: FinancingSimulationRecord) => {
    setEditingId(sim.id)
    setSelectedPartnerId(sim.partner_id || '')
    setSelectedLineId(sim.credit_line_id || '')
    setTotalValue(Number(sim.total_negotiation_value) || Number(sim.financed_amount) || 0)
    setDownPayment(Number(sim.down_payment) || 0)
    setAnnualRate(Number(sim.interest_rate_annual) || 15)
    setInstallments(Number(sim.installments) || 60)
    setStatus(sim.status || 'Em análise')
    setNotes(sim.notes || '')
    setModalOpen(true)
  }

  const handlePartnerChange = (partnerId: string) => {
    setSelectedPartnerId(partnerId)
    const lines = creditLines.filter((l) => l.partner_id === partnerId)
    if (lines.length > 0) {
      const line = lines[0]
      setSelectedLineId(line.id)
      setAnnualRate(line.interest_rate_annual)
      setInstallments(line.max_installments)
      if (line.min_down_payment_percent && line.min_down_payment_percent > 0 && totalValue > 0) {
        setDownPayment(Math.round((totalValue * line.min_down_payment_percent) / 100))
      }
    } else {
      setSelectedLineId('')
    }
  }

  const handleLineChange = (lineId: string) => {
    setSelectedLineId(lineId)
    const line = creditLines.find((l) => l.id === lineId)
    if (line) {
      setAnnualRate(line.interest_rate_annual)
      setInstallments(line.max_installments)
      if (line.min_down_payment_percent && line.min_down_payment_percent > 0 && totalValue > 0) {
        setDownPayment(Math.round((totalValue * line.min_down_payment_percent) / 100))
      }
    }
  }

  const handleSaveSimulation = async () => {
    if (!selectedPartnerId) {
      toast({
        variant: 'destructive',
        title: 'Selecione o banco parceiro',
      })
      return
    }

    if (totalValue <= 0 || financedAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Valor financiado inválido',
        description: 'O valor financiado deve ser maior que zero.',
      })
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        company_id: companyId,
        negotiation_id: neg.id,
        partner_id: selectedPartnerId,
        credit_line_id: selectedLineId || null,
        total_negotiation_value: totalValue,
        down_payment: downPayment,
        financed_amount: financedAmount,
        interest_rate_annual: annualRate,
        installments,
        monthly_payment: simulation.monthlyPayment,
        total_paid: simulation.totalPaid,
        total_interest: simulation.totalInterest,
        status,
        notes,
      }

      if (editingId) {
        await pb.collection('financing_simulations').update(editingId, payload)
        toast({ title: 'Financiamento atualizado' })
      } else {
        await pb.collection('financing_simulations').create(payload)
        toast({ title: 'Financiamento criado' })
      }

      setModalOpen(false)
      loadSimulations()
      if (reload) reload()
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: e.message,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateStatusInline = async (simId: string, newStatus: string) => {
    try {
      await pb.collection('financing_simulations').update(simId, { status: newStatus })
      setSimulations((prev) => prev.map((s) => (s.id === simId ? { ...s, status: newStatus } : s)))
      toast({ title: `Status atualizado para ${newStatus}` })
      if (reload) reload()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao alterar status', description: e.message })
    }
  }

  const handleDeleteSimulation = async (simId: string) => {
    if (!confirm('Excluir este financiamento da negociação?')) return
    try {
      await pb.collection('financing_simulations').delete(simId)
      toast({ title: 'Financiamento removido' })
      loadSimulations()
      if (reload) reload()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: e.message })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl">Financiamentos da Negociação</CardTitle>
            </div>

            <Button onClick={handleOpenCreate} size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Novo Financiamento
            </Button>
          </div>
        </CardHeader>

        {/* Lista de Simulações */}
        <CardContent className="p-0">
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground border-t">
              Carregando financiamentos...
            </div>
          ) : simulations.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground border-t">
              <Landmark className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              Nenhum financiamento vinculado a esta negociação ainda.
              <p className="text-xs text-muted-foreground/80 mt-1">
                Clique em "Novo Financiamento" acima para simular parcelas e vincular ao banco.
              </p>
            </div>
          ) : (
            <div className="divide-y border-t text-sm">
              {simulations.map((sim) => {
                const partnerName = sim.expand?.partner_id?.name || 'Banco'
                const lineName = sim.expand?.credit_line_id?.name
                const st = sim.status || 'Em análise'

                return (
                  <div
                    key={sim.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/15 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-base">
                          {partnerName}
                        </span>
                        {lineName && (
                          <Badge variant="outline" className="text-xs font-normal">
                            {lineName}
                          </Badge>
                        )}
                        <Badge
                          className={
                            st === 'Aprovado'
                              ? 'bg-emerald-600 text-white text-xs'
                              : st === 'Recusado'
                                ? 'bg-rose-600 text-white text-xs'
                                : 'bg-amber-500 text-white text-xs'
                          }
                        >
                          {st === 'Aprovado' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {st === 'Recusado' && <XCircle className="w-3 h-3 mr-1" />}
                          {st === 'Em análise' && <Clock className="w-3 h-3 mr-1" />}
                          {st}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {sim.installments}x de{' '}
                        <strong className="text-foreground">
                          {BRL(Number(sim.monthly_payment) || 0)}
                        </strong>{' '}
                        · Taxa: {sim.interest_rate_annual}% a.a.
                        {Number(sim.down_payment) > 0 && ` · Entrada: ${BRL(sim.down_payment)}`}
                      </p>

                      {sim.notes && (
                        <p className="text-xs text-muted-foreground italic">{sim.notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 justify-between sm:justify-end">
                      <div className="text-right">
                        <p className="font-bold text-base text-foreground">
                          {BRL(Number(sim.financed_amount) || 0)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Total: {BRL(Number(sim.total_paid) || 0)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Select
                          value={st}
                          onValueChange={(val) => handleUpdateStatusInline(sim.id, val)}
                        >
                          <SelectTrigger className="h-8 text-xs w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Em análise">Em análise</SelectItem>
                            <SelectItem value="Aprovado">Aprovado</SelectItem>
                            <SelectItem value="Recusado">Recusado</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(sim)}
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteSimulation(sim.id)}
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO: NOVO / EDITAR FINANCIAMENTO */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar Financiamento' : 'Novo Financiamento da Negociação'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Parceiro e Linha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Banco / Parceiro *</Label>
                <Select value={selectedPartnerId} onValueChange={handlePartnerChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o banco..." />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.partner_type ? `(${p.partner_type})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Linha de Crédito</Label>
                <Select
                  value={selectedLineId}
                  onValueChange={handleLineChange}
                  disabled={!selectedPartnerId || availableLines.length === 0}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue
                      placeholder={
                        availableLines.length === 0 ? 'Nenhuma linha cadastrada' : 'Selecione...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {availableLines.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({l.interest_rate_annual}% a.a.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40 border">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Valor Total (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={totalValue || ''}
                  onChange={(e) => setTotalValue(Number(e.target.value) || 0)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Entrada (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={downPayment || ''}
                  onChange={(e) => setDownPayment(Number(e.target.value) || 0)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Financiado</Label>
                <div className="h-9 px-3 flex items-center font-bold text-primary rounded-md bg-background border text-sm">
                  {BRL(financedAmount)}
                </div>
              </div>
            </div>

            {/* Taxa, Prazo e Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Taxa (% a.a.)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={annualRate || ''}
                  onChange={(e) => setAnnualRate(Number(e.target.value) || 0)}
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  ~{simulation.monthlyRatePct}% ao mês
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Prazo (Meses)</Label>
                <Input
                  type="number"
                  min="1"
                  max="240"
                  value={installments || ''}
                  onChange={(e) => setInstallments(Number(e.target.value) || 1)}
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  {(installments / 12).toFixed(1)} ano(s)
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em análise">🟡 Em análise</SelectItem>
                    <SelectItem value="Aprovado">🟢 Aprovado</SelectItem>
                    <SelectItem value="Recusado">🔴 Recusado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Card de Simulação Price */}
            <div className="p-3.5 rounded-lg border border-primary/30 bg-primary/5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-primary">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" /> Simulação Tabela Price
                </span>
                <span>{installments} parcelas fixas</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2.5 rounded-md bg-background border">
                  <p className="text-[11px] text-muted-foreground">Parcela Mensal</p>
                  <p className="text-base font-bold text-primary">
                    {BRL(simulation.monthlyPayment)}
                  </p>
                </div>

                <div className="p-2.5 rounded-md bg-background border">
                  <p className="text-[11px] text-muted-foreground">Total Financiado</p>
                  <p className="text-sm font-bold text-foreground">
                    {BRL(simulation.totalFinancedPaid)}
                  </p>
                </div>

                <div className="p-2.5 rounded-md bg-background border">
                  <p className="text-[11px] text-muted-foreground">Juros Totais</p>
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                    {BRL(simulation.totalInterest)}
                  </p>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Input
                placeholder="Ex: Protocolo de análise, contato do gerente..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveSimulation} disabled={saving} className="gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Gravando...' : 'Salvar Financiamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FinancingTab
