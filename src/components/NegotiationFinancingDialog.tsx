import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import {
  getFinancingPartners,
  getFinancingCreditLines,
  FinancingPartnerRecord,
  FinancingCreditLineRecord,
} from '@/services/financing'
import { calculatePriceSimulation, PriceSimulationResult } from '@/lib/price-calculator'
import { Landmark, Calculator, CheckCircle2, DollarSign } from 'lucide-react'

interface NegotiationFinancingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  negotiation: any
  defaultTotalValue?: number
  onSaved?: () => void
}

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export function NegotiationFinancingDialog({
  open,
  onOpenChange,
  negotiation,
  defaultTotalValue,
  onSaved,
}: NegotiationFinancingDialogProps) {
  const { toast } = useToast()
  const [partners, setPartners] = useState<FinancingPartnerRecord[]>([])
  const [creditLines, setCreditLines] = useState<FinancingCreditLineRecord[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('')
  const [selectedLineId, setSelectedLineId] = useState<string>('')
  const [totalValue, setTotalValue] = useState<number>(0)
  const [downPayment, setDownPayment] = useState<number>(0)
  const [annualRate, setAnnualRate] = useState<number>(15)
  const [installments, setInstallments] = useState<number>(60)
  const [status, setStatus] = useState<string>('Em análise')
  const [notes, setNotes] = useState<string>('')
  const [existingSimId, setExistingSimId] = useState<string | null>(null)
  const [saving, setSaving] = useState<boolean>(false)

  const companyId = negotiation?.company_id

  // Carrega parceiros e linhas
  useEffect(() => {
    if (open && companyId) {
      Promise.all([getFinancingPartners(companyId), getFinancingCreditLines(companyId)]).then(
        ([parts, lines]) => {
          setPartners(parts.filter((p) => p.active !== false))
          setCreditLines(lines.filter((l) => l.active !== false))
        },
      )
    }
  }, [open, companyId])

  // Inicializa valores com base na negociação ou proposta
  useEffect(() => {
    if (!open || !negotiation) return

    const initialTotal =
      defaultTotalValue && defaultTotalValue > 0
        ? defaultTotalValue
        : Number(negotiation.sizing?.total_price || negotiation.sizing?.kit_price || 0)

    setTotalValue(initialTotal)
    setDownPayment(0)

    // Busca se já existe simulação salva para esta negociação
    pb.collection('financing_simulations')
      .getList(1, 1, {
        filter: `negotiation_id = '${negotiation.id}'`,
        sort: '-created',
      })
      .then((res) => {
        if (res.items.length > 0) {
          const sim = res.items[0]
          setExistingSimId(sim.id)
          setSelectedPartnerId(sim.partner_id || '')
          setSelectedLineId(sim.credit_line_id || '')
          setTotalValue(Number(sim.total_negotiation_value) || initialTotal)
          setDownPayment(Number(sim.down_payment) || 0)
          setAnnualRate(Number(sim.interest_rate_annual) || 15)
          setInstallments(Number(sim.installments) || 60)
          setStatus(sim.status || 'Em análise')
          setNotes(sim.notes || '')
        } else {
          setExistingSimId(null)
        }
      })
      .catch(() => {
        setExistingSimId(null)
      })
  }, [open, negotiation, defaultTotalValue])

  // Filtra linhas pelo parceiro selecionado
  const availableLines = useMemo(() => {
    if (!selectedPartnerId) return []
    return creditLines.filter((l) => l.partner_id === selectedPartnerId)
  }, [selectedPartnerId, creditLines])

  // Quando escolhe parceiro, seleciona primeira linha se houver
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

  // Quando escolhe linha de crédito
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

  // Cálculo da simulação via Price
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

  const handleSave = async () => {
    if (!selectedPartnerId) {
      toast({
        variant: 'destructive',
        title: 'Selecione um banco/parceiro',
        description: 'É necessário vincular a simulação a uma instituição financeira.',
      })
      return
    }

    setSaving(true)
    try {
      const payload: any = {
        company_id: companyId,
        negotiation_id: negotiation.id,
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

      if (existingSimId) {
        await pb.collection('financing_simulations').update(existingSimId, payload)
      } else {
        const created = await pb.collection('financing_simulations').create(payload)
        setExistingSimId(created.id)
      }

      toast({
        title: 'Financiamento salvo!',
        description: 'Simulação vinculada à negociação com sucesso.',
      })
      onOpenChange(false)
      if (onSaved) onSaved()
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar financiamento',
        description: e.message || 'Falha ao gravar simulação.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Landmark className="w-5 h-5" />
            <DialogTitle>Simulador de Financiamento</DialogTitle>
          </div>
          <DialogDescription>
            Simule parcelas fixas com Tabela Price para a negociação{' '}
            <strong>{negotiation?.title}</strong> e acompanhe o status de aprovação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Seleção do Parceiro e Linha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Banco / Parceiro de Crédito *</Label>
              <Select value={selectedPartnerId} onValueChange={handlePartnerChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o banco parceiro..." />
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
              <Label className="text-xs font-semibold">Linha / Produto de Crédito</Label>
              <Select
                value={selectedLineId}
                onValueChange={handleLineChange}
                disabled={!selectedPartnerId || availableLines.length === 0}
              >
                <SelectTrigger className="h-9">
                  <SelectValue
                    placeholder={
                      availableLines.length === 0
                        ? 'Nenhuma linha cadastrada'
                        : 'Selecione a linha...'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableLines.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.interest_rate_annual}% a.a. até {l.max_installments}x)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Valores: Total, Entrada e Financiado */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-muted/40 border">
            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Valor Financiado</Label>
              <div className="h-9 px-3 flex items-center font-bold text-primary rounded-md bg-background border text-sm">
                {BRL(financedAmount)}
              </div>
            </div>
          </div>

          {/* Taxa de juros e Prazo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Taxa de Juros (% a.a.)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={annualRate || ''}
                onChange={(e) => setAnnualRate(Number(e.target.value) || 0)}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                Equivalente a {simulation.monthlyRatePct}% ao mês
              </p>
            </div>

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status da Análise</Label>
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

          {/* Card de Resultado da Simulação (Tabela Price) */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <Calculator className="w-4 h-4" /> Resultado da Tabela Price (Parcela Fixa)
                </span>
                <Badge variant="outline" className="text-xs font-medium">
                  {installments} parcelas fixas
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Parcela Mensal Estimada</p>
                  <p className="text-xl font-bold text-primary">{BRL(simulation.monthlyPayment)}</p>
                  <p className="text-[11px] text-muted-foreground">por mês</p>
                </div>

                <div className="p-3 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Total Pago (Financiado)</p>
                  <p className="text-lg font-bold text-foreground">
                    {BRL(simulation.totalFinancedPaid)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {BRL(simulation.totalPaid)} com entrada
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-background border">
                  <p className="text-xs text-muted-foreground">Total em Juros</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {BRL(simulation.totalInterest)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {financedAmount > 0
                      ? `${((simulation.totalInterest / financedAmount) * 100).toFixed(0)}% sobre o financiado`
                      : '0%'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações da Análise */}
          <div className="space-y-1.5">
            <Label className="text-xs">Observações do Financiamento (Opcional)</Label>
            <Input
              placeholder="Ex: Documentação enviada ao correspondente, protocolo nº 12345..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {saving ? 'Gravando...' : 'Salvar Financiamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
