import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileText, ArrowRight, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'

export function ProposalWizardModal({ open, onOpenChange, neg, reload, openViewer }: any) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  const [validity, setValidity] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [notes, setNotes] = useState('')
  const [discount, setDiscount] = useState<number>(0)

  const [totalValue, setTotalValue] = useState(0)

  useEffect(() => {
    if (open && step === 1) {
      setValidity(new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0])
      setStep(1)

      pb.collection('pv_modules')
        .getOne(neg.sizing?.selected_module_id || '')
        .then((mod) => {
          pb.collection('pv_inverters')
            .getOne(neg.sizing?.selected_inverter_id || '')
            .then((inv) => {
              const baseCost = (mod?.price || 0) * (neg.sizing?.module_qty || 0) + (inv?.price || 0)
              const price = baseCost > 0 ? baseCost * 1.4 : (neg.sizing?.kit_power_kwp || 0) * 3500
              setTotalValue(price)
            })
            .catch(() => {
              setTotalValue((neg.sizing?.kit_power_kwp || 0) * 3500)
            })
        })
        .catch(() => {
          setTotalValue((neg.sizing?.kit_power_kwp || 0) * 3500)
        })
    }
  }, [open, neg.sizing])

  const handleNext = () => setStep(2)
  const handlePrev = () => setStep(1)

  const handleGenerate = async () => {
    const maxDiscount = (user as any)?.max_discount || 0
    if (discount > maxDiscount) {
      toast({
        variant: 'destructive',
        title: 'Desconto não permitido',
        description: `O desconto máximo permitido para seu usuário é ${maxDiscount}%`,
      })
      return
    }

    setLoading(true)
    try {
      const finalPrice = totalValue * (1 - discount / 100)

      let settings: any = {}
      try {
        settings = await pb
          .collection('proposal_settings')
          .getFirstListItem(`company_id='${neg.company_id}'`)
      } catch {
        /* intentionally ignored */
      }

      let budgets: any[] = []
      try {
        budgets = await pb
          .collection('budgets')
          .getFullList({ filter: `negotiation_id='${neg.id}'` })
      } catch {
        /* intentionally ignored */
      }

      const snapshot = {
        sizing: neg.sizing || {},
        settings: {
          branding: settings.branding || {},
          pages_layout: settings.pages_layout || [],
          template: settings.active_template_id || settings.template || 'modern',
          visible_pages: settings.visible_pages || [],
        },
      }

      const cost_breakdown = budgets.map((b) => ({
        name: b.name,
        cost: b.cost,
        margin: b.margin,
        price: b.price,
      }))

      if (cost_breakdown.length === 0) {
        cost_breakdown.push({
          name: 'Sistema Fotovoltaico (Estimado)',
          cost: totalValue,
          margin: discount,
          price: finalPrice,
        })
      }

      const rec = await pb.collection('proposals').create({
        company_id: neg.company_id,
        negotiation_id: neg.id,
        description: `Proposta Sistema ${(neg.sizing?.kit_power_kwp || 0).toFixed(2)} kWp`,
        price: finalPrice,
        status: 'draft',
        validity_date: validity ? new Date(validity).toISOString() : null,
        payment_terms: paymentTerms,
        notes: notes,
        discount_amount: discount,
        total_value: finalPrice,
        kit_details: JSON.stringify(snapshot),
        cost_breakdown: cost_breakdown,
      })

      toast({ title: 'Proposta gerada com sucesso' })
      reload()
      onOpenChange(false)
      openViewer(rec)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Gerador de Proposta - Passo {step} de 2</DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Revisão do Dimensionamento' : 'Ajustes Financeiros e Condições'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-4">
            <div className="bg-muted/30 p-4 rounded-lg border space-y-2">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Potência do Kit:</span>
                <span className="font-semibold">
                  {(neg.sizing?.kit_power_kwp || 0).toFixed(2)} kWp
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Qtd. Módulos:</span>
                <span className="font-semibold">{neg.sizing?.module_qty || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-4 italic">
                Para alterar estes itens, retorne à aba "Dimensionamento".
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleNext}>
                Avançar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Validade da Proposta</Label>
                <Input type="date" value={validity} onChange={(e) => setValidity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Desconto (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max={(user as any)?.max_discount || 0}
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Máx. permitido: {(user as any)?.max_discount || 0}%
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Condições de Pagamento</Label>
              <Input
                placeholder="Ex: Entrada de 30% + 12x sem juros"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações Internas (Não sai no PDF)</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 flex justify-between items-center mt-4">
              <span className="font-medium text-lg">Valor Final:</span>
              <span className="font-bold text-xl text-primary">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  totalValue * (1 - discount / 100),
                )}
              </span>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handlePrev}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
              <Button onClick={handleGenerate} disabled={loading}>
                <FileText className="w-4 h-4 mr-2" /> Gerar PDF
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
