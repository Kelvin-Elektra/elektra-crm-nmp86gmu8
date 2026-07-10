import { useState } from 'react'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Button } from '@/components/ui/button'

export function TaxWeightTooltip() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">Como funcionam os pesos tributários? Clique para detalhes.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Peso Tributário</DialogTitle>
            <VisuallyHidden>
              <DialogDescription>
                Explicação sobre como os pesos tributários impactam a precificação.
              </DialogDescription>
            </VisuallyHidden>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              <strong className="text-foreground">Introdução:</strong> O Peso define a porcentagem
              da base total (Produto ou Serviço) sobre a qual a alíquota do imposto será aplicada.
            </p>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">1. 'Minha empresa fatura o kit cheio'</p>
              <p>
                Em uma venda de <strong className="text-foreground">R$ 100.000,00</strong>, se você
                definir um peso de <strong className="text-foreground">60%</strong> para produto e{' '}
                <strong className="text-foreground">40%</strong> para serviço, a alíquota de produto
                será aplicada sobre <strong className="text-foreground">R$ 60.000,00</strong>,
                enquanto a de serviço incidirá sobre{' '}
                <strong className="text-foreground">R$ 40.000,00</strong>.
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-foreground">
                2. 'Distribuidor fatura o kit e minha empresa fatura a diferença'
              </p>
              <p>
                Em uma venda de <strong className="text-foreground">R$ 100.000,00</strong> onde o
                kit custa <strong className="text-foreground">R$ 70.000,00</strong>, o imposto
                incide apenas sobre a margem bruta de{' '}
                <strong className="text-foreground">R$ 30.000,00</strong>. Aplicando os mesmos pesos
                (60% produto / 40% serviço), teremos a alíquota de produto sobre{' '}
                <strong className="text-foreground">R$ 18.000,00</strong> e a de serviço sobre{' '}
                <strong className="text-foreground">R$ 12.000,00</strong>.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-amber-900 text-xs">
                ⚠️ Para que o cálculo seja correto, a soma dos pesos deve totalizar sempre{' '}
                <strong>100%</strong>.
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
