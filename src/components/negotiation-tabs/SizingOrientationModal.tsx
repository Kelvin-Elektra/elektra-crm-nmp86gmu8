import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { updateNegotiation } from '@/services/db'
import { useToast } from '@/hooks/use-toast'

export function SizingOrientationModal({
  open,
  onOpenChange,
  neg,
  reload,
  efficiencyRule,
  recommendedModules,
  estMonthlyGen,
  avgConsumption,
}: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [useRoofFaces, setUseRoofFaces] = useState(neg.use_roof_faces || false)
  const [roofFaces, setRoofFaces] = useState<any[]>(
    neg.roof_faces_data?.length ? neg.roof_faces_data : [{ orientation: '', modules: '' }],
  )

  const orientationOptions = efficiencyRule?.orientation_losses || []

  const handleSave = async () => {
    setLoading(true)
    try {
      const totalFaceModules = roofFaces.reduce((acc, f) => acc + (Number(f.modules) || 0), 0)

      const sizing = neg.sizing || {}
      const newSizing = { ...sizing }

      if (useRoofFaces) {
        newSizing.module_qty = totalFaceModules
      }

      await updateNegotiation(neg.id, {
        use_roof_faces: useRoofFaces,
        roof_faces_data: useRoofFaces ? roofFaces : [],
        sizing: newSizing,
      })
      toast({ title: 'Orientação salva com sucesso' })
      reload()
      onOpenChange(false)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Orientação das Faces</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>Configure a orientação das faces do telhado.</DialogDescription>
          </VisuallyHidden>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label>Considerar orientação das faces</Label>
            <Switch checked={useRoofFaces} onCheckedChange={setUseRoofFaces} />
          </div>
          {estMonthlyGen !== undefined && avgConsumption !== undefined && (
            <div className="flex justify-between items-center text-sm p-3 rounded bg-muted/30 border">
              <span>
                Geração Estimada:{' '}
                <strong
                  className={estMonthlyGen < avgConsumption ? 'text-destructive' : 'text-green-600'}
                >
                  {Math.round(estMonthlyGen)} kWh/mês
                </strong>
              </span>
              <span>
                Consumo Médio: <strong>{Math.round(avgConsumption)} kWh/mês</strong>
              </span>
            </div>
          )}
          {useRoofFaces && (
            <div className="space-y-3 bg-muted/30 p-3 rounded-lg border">
              {recommendedModules > 0 && (
                <div className="text-sm text-muted-foreground mb-2">
                  Quantidade mínima de módulos recomendada:{' '}
                  <strong className="text-foreground">{recommendedModules}</strong>
                </div>
              )}
              {roofFaces.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select
                    value={item.orientation}
                    onValueChange={(v) => {
                      const arr = [...roofFaces]
                      arr[idx].orientation = v
                      setRoofFaces(arr)
                    }}
                  >
                    <SelectTrigger className="flex-1 h-8">
                      <SelectValue placeholder="Orientação" />
                    </SelectTrigger>
                    <SelectContent>
                      {orientationOptions.map((o: any) => (
                        <SelectItem key={o.orientation} value={o.orientation}>
                          {o.orientation} (-{o.loss}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="w-20 h-8"
                    value={item.modules}
                    onChange={(e) => {
                      const arr = [...roofFaces]
                      arr[idx].modules = e.target.value
                      setRoofFaces(arr)
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setRoofFaces(roofFaces.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setRoofFaces([...roofFaces, { orientation: '', modules: '' }])}
              >
                <Plus className="h-4 w-4 mr-2" /> Adicionar Face
              </Button>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
