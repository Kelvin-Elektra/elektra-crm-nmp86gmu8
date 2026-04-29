import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Save } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export function EfficiencyTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [ruleId, setRuleId] = useState<string | null>(null)
  const [nominalLoss, setNominalLoss] = useState('23')
  const [orientations, setOrientations] = useState<{ orientation: string; loss: string }[]>([
    { orientation: 'Norte', loss: '0' },
    { orientation: 'Sul', loss: '15' },
    { orientation: 'Leste', loss: '5' },
    { orientation: 'Oeste', loss: '5' },
  ])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.company_id) {
      pb.collection('pv_efficiency_rules')
        .getFirstListItem(`company_id='${user.company_id}'`)
        .then((record) => {
          setRuleId(record.id)
          if (record.nominal_loss !== undefined) setNominalLoss(String(record.nominal_loss))
          if (record.orientation_losses && Array.isArray(record.orientation_losses)) {
            setOrientations(record.orientation_losses)
          }
        })
        .catch(() => {})
    }
  }, [user?.company_id])

  const handleSave = async () => {
    if (!user?.company_id) return
    setLoading(true)
    try {
      const data = {
        company_id: user.company_id,
        nominal_loss: Number(nominalLoss) || 0,
        orientation_losses: orientations.map((o) => ({
          orientation: o.orientation,
          loss: Number(o.loss) || 0,
        })),
      }

      if (ruleId) {
        await pb.collection('pv_efficiency_rules').update(ruleId, data)
      } else {
        const created = await pb.collection('pv_efficiency_rules').create(data)
        setRuleId(created.id)
      }
      toast({ title: 'Sucesso', description: 'Regras de eficiência salvas com sucesso!' })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: getErrorMessage(e) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Eficiência PV</CardTitle>
        <CardDescription>Configure as perdas nominais e por orientação do telhado.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-sm">
          <Label>Perdas Nominais Globais (%)</Label>
          <Input
            type="number"
            value={nominalLoss}
            onChange={(e) => setNominalLoss(e.target.value)}
            placeholder="Ex: 23"
          />
          <p className="text-xs text-muted-foreground">
            Valor padrão de perdas do sistema (cabos, inversor, sujeira, etc).
          </p>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <Label>Perdas Adicionais por Orientação (%)</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOrientations([...orientations, { orientation: '', loss: '0' }])}
            >
              <Plus className="h-4 w-4 mr-2" /> Adicionar Orientação
            </Button>
          </div>

          <div className="space-y-3">
            {orientations.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Input
                  placeholder="Orientação (Ex: Norte, NE...)"
                  value={item.orientation}
                  onChange={(e) => {
                    const newArr = [...orientations]
                    newArr[idx].orientation = e.target.value
                    setOrientations(newArr)
                  }}
                />
                <Input
                  type="number"
                  placeholder="Perda %"
                  value={item.loss}
                  className="w-32"
                  onChange={(e) => {
                    const newArr = [...orientations]
                    newArr[idx].loss = e.target.value
                    setOrientations(newArr)
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive"
                  onClick={() => setOrientations(orientations.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-end border-t">
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" /> Salvar Regras
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
