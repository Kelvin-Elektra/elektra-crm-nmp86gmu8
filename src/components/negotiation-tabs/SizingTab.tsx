import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export function SizingTab({ neg, reload }: { neg: any; reload: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const initialSizing = neg.sizing || {}

  const [formData, setFormData] = useState({
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

  const calculate = async () => {
    setLoading(true)
    try {
      const vals = Object.values(formData).map((v) => Number(v) || 0)
      const avg = vals.reduce((a, b) => a + b, 0) / 12

      await pb.collection('negotiations').update(neg.id, {
        sizing: formData,
        avg_consumption: Math.round(avg),
      })
      toast({ title: 'Salvo', description: 'Dimensionamento atualizado.' })
      reload()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao salvar.' })
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dimensionamento Solar</CardTitle>
        <CardDescription>
          Insira o histórico de consumo em kWh da fatura de energia do cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          {months.map((m) => (
            <div key={m.k} className="space-y-2">
              <Label>{m.l}</Label>
              <Input
                type="number"
                value={(formData as any)[m.k]}
                onChange={(e) => setFormData((p) => ({ ...p, [m.k]: e.target.value }))}
                placeholder="kWh"
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={calculate} disabled={loading}>
            {loading ? 'Calculando...' : 'Salvar e Calcular Média'}
          </Button>
          {neg.avg_consumption > 0 && (
            <div className="text-sm font-medium">
              Média Atual:{' '}
              <span className="text-primary text-lg">{neg.avg_consumption} kWh/mês</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
