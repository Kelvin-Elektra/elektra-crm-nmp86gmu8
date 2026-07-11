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
import { NumericInput } from '@/components/ui/numeric-input'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { updateNegotiation } from '@/services/db'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'

export function ConsumptionCard({ neg, reload }: { neg: any; reload?: () => void }) {
  const initialSizing = neg.sizing || {}
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [isMonthly, setIsMonthly] = useState(initialSizing.type === 'monthly')
  const [avgConsumption, setAvgConsumption] = useState(Number(neg.avg_consumption) || 0)

  const [monthlyData, setMonthlyData] = useState<Record<string, number>>({
    jan: Number(initialSizing.jan) || 0,
    feb: Number(initialSizing.feb) || 0,
    mar: Number(initialSizing.mar) || 0,
    apr: Number(initialSizing.apr) || 0,
    may: Number(initialSizing.may) || 0,
    jun: Number(initialSizing.jun) || 0,
    jul: Number(initialSizing.jul) || 0,
    aug: Number(initialSizing.aug) || 0,
    sep: Number(initialSizing.sep) || 0,
    oct: Number(initialSizing.oct) || 0,
    nov: Number(initialSizing.nov) || 0,
    dec: Number(initialSizing.dec) || 0,
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

  const chartData = months.map((m) => ({
    name: m.l,
    consumo: isMonthly ? (monthlyData as any)[m.k] || 0 : avgConsumption || 0,
  }))

  const handleSave = async () => {
    setLoading(true)
    try {
      let computedAvg = 0
      let sizingPayload: any = { type: isMonthly ? 'monthly' : 'average' }

      if (isMonthly) {
        const vals = Object.values(monthlyData)
        computedAvg = Math.round(vals.reduce((a, b) => a + b, 0) / 12)
        sizingPayload = { ...sizingPayload, ...monthlyData }
      } else {
        computedAvg = avgConsumption
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
        <div className="flex flex-col md:flex-row gap-8 mb-6">
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

        <div className="h-48 w-full mt-4">
          <ChartContainer
            config={{ consumo: { label: 'Consumo', color: 'hsl(var(--primary))' } }}
            className="w-full h-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="consumo" fill="var(--color-consumo)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
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
                <NumericInput
                  value={avgConsumption}
                  onValueChange={(v) => setAvgConsumption(v)}
                  placeholder="0"
                />
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {months.map((m) => (
                  <div key={m.k} className="space-y-1">
                    <Label className="text-xs">{m.l}</Label>
                    <NumericInput
                      className="h-8 text-sm"
                      value={(monthlyData as any)[m.k]}
                      onValueChange={(v) => setMonthlyData((p) => ({ ...p, [m.k]: v }))}
                      placeholder="0"
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
