import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { updateNegotiation } from '@/services/db'

export function ConsumptionCard({ neg, reload }: { neg: any; reload?: () => void }) {
  const initialSizing = neg.sizing || {}
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [isMonthly, setIsMonthly] = useState(initialSizing.type === 'monthly')
  const [avgConsumption, setAvgConsumption] = useState(neg.avg_consumption || '')

  const [monthlyData, setMonthlyData] = useState({
    jan: initialSizing.jan || '',
    feb: initialSizing.feb || '',
    mar: initialSizing.mar || '',
    apr: initialSizing.apr || '',
    may: initialSizing.may || '',
    jun: initialSizing.jun || '',
    jul: initialSizing.jul || '',
    aug: initialSizing.aug || '',
    sep: initialSizing.sep || '',
    oct: initialSizing.oct || '',
    nov: initialSizing.nov || '',
    dec: initialSizing.dec || '',
  })

  const months = [
    { k: 'jan', l: 'Jan' },
    { k: 'feb', l: 'Fev' },
    { k: 'mar', l: 'Mar' },
    { k: 'apr', l: 'Abr' },
    { k: 'may', l: 'Mai' },
    { k: 'jun', l: 'Jun' },
    { k: 'jul', l: 'Jul' },
    { k: 'aug', l: 'Ago' },
    { k: 'sep', l: 'Set' },
    { k: 'oct', l: 'Out' },
    { k: 'nov', l: 'Nov' },
    { k: 'dec', l: 'Dez' },
  ]

  const handleSave = async () => {
    setLoading(true)
    try {
      let computedAvg = 0
      let sizingPayload: any = { type: isMonthly ? 'monthly' : 'average' }

      if (isMonthly) {
        const vals = Object.values(monthlyData).map((v) => Number(v) || 0)
        computedAvg = Math.round(vals.reduce((a, b) => a + b, 0) / 12)
        sizingPayload = { ...sizingPayload, ...monthlyData }
      } else {
        computedAvg = Number(avgConsumption) || 0
      }

      await updateNegotiation(neg.id, {
        avg_consumption: computedAvg,
        sizing: { ...neg.sizing, ...sizingPayload },
      })
      toast({ description: 'Dados salvos com sucesso' })
      setOpen(false)
      reload?.()
    } catch (e) {
      toast({ variant: 'destructive', description: 'Erro ao salvar' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="h-5 w-5" /> Histórico de Consumo
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </Button>
      </CardHeader>
      <CardContent className="mt-2">
        <div className="flex items-center gap-8">
          <div>
            <p className="text-sm text-muted-foreground">Modo de Entrada</p>
            <p className="font-medium">
              {initialSizing.type === 'monthly' ? 'Mês a Mês' : 'Média Única'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Consumo Médio</p>
            <p className="text-xl font-bold text-primary">
              {neg.avg_consumption || 0}{' '}
              <span className="text-sm font-normal text-muted-foreground">kWh/mês</span>
            </p>
          </div>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Consumo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2 mb-4">
              <Label htmlFor="consumption-mode" className="text-sm cursor-pointer">
                Média Única
              </Label>
              <Switch id="consumption-mode" checked={isMonthly} onCheckedChange={setIsMonthly} />
              <Label htmlFor="consumption-mode" className="text-sm cursor-pointer">
                Mês a Mês
              </Label>
            </div>

            {!isMonthly ? (
              <div className="space-y-2">
                <Label>Consumo Médio (kWh/mês)</Label>
                <Input
                  type="number"
                  value={avgConsumption}
                  onChange={(e) => setAvgConsumption(e.target.value)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {months.map((m) => (
                  <div key={m.k} className="space-y-1">
                    <Label className="text-xs">{m.l}</Label>
                    <Input
                      type="number"
                      className="h-8 text-sm"
                      value={(monthlyData as any)[m.k]}
                      onChange={(e) => setMonthlyData((p) => ({ ...p, [m.k]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
