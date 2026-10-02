import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Save, FileSpreadsheet, Download } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { generateCsv, downloadCsv, parseCsv } from '@/lib/csv-helper'

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
  const [importing, setImporting] = useState(false)

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

  // Download modelo de regras de orientação
  const handleDownloadTemplate = () => {
    const headers = ['Orientacao', 'Perda_%']
    const sampleRows = [
      ['Norte', 0],
      ['Nordeste', 3],
      ['Noroeste', 3],
      ['Leste', 5],
      ['Oeste', 5],
      ['Sudeste', 10],
      ['Sudoeste', 10],
      ['Sul', 15],
    ]
    const content = generateCsv(headers, sampleRows)
    downloadCsv('modelo_regras_eficiencia_orientacao.csv', content)
    toast({
      title: 'Modelo baixado!',
      description: 'Preencha o arquivo com as orientações e percentuais de perda.',
    })
  }

  // Upload e Upsert das orientações
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.company_id) return
    setImporting(true)
    try {
      const text = await file.text()
      const { rows } = parseCsv(text)
      if (rows.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Arquivo sem dados',
          description: 'Nenhuma linha encontrada na planilha.',
        })
        return
      }

      let updatedCount = 0
      let createdCount = 0
      const nextOrientations = [...orientations]

      for (const row of rows) {
        const ori = (row['Orientacao'] || row['orientacao'] || row['Orientação'] || '').trim()
        const lossStr = row['Perda_%'] || row['loss'] || row['perda'] || '0'
        const lossNum = Number(lossStr.replace(',', '.')) || 0

        if (!ori) continue

        const existingIdx = nextOrientations.findIndex(
          (o) => o.orientation.trim().toLowerCase() === ori.toLowerCase(),
        )

        if (existingIdx >= 0) {
          nextOrientations[existingIdx] = { orientation: ori, loss: String(lossNum) }
          updatedCount++
        } else {
          nextOrientations.push({ orientation: ori, loss: String(lossNum) })
          createdCount++
        }
      }

      setOrientations(nextOrientations)

      // Gravar automaticamente no PocketBase
      const data = {
        company_id: user.company_id,
        nominal_loss: Number(nominalLoss) || 0,
        orientation_losses: nextOrientations.map((o) => ({
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

      toast({
        title: 'Orientações importadas!',
        description: `${createdCount} criadas e ${updatedCount} atualizadas com sucesso.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao importar planilha',
        description: err.message,
      })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle>Eficiência PV</CardTitle>
          <CardDescription>
            Configure as perdas nominais e por orientação do telhado.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="gap-2 text-xs"
          >
            <Download className="w-3.5 h-3.5 text-primary" /> Modelo (.csv)
          </Button>
          <label className="inline-flex">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-primary/40 text-xs font-medium text-primary hover:bg-primary/5 cursor-pointer">
              <FileSpreadsheet className="w-4 h-4" />
              {importing ? 'Importando...' : 'Importar Planilha'}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportFile}
              disabled={importing}
            />
          </label>
        </div>
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
