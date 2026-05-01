import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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

export function SizingGenerationModal({
  open,
  onOpenChange,
  neg,
  reload,
  efficiencyRule,
  recommendedModules,
}: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const sizing = neg.sizing || {}

  const losses = sizing.losses ?? (efficiencyRule?.nominal_loss || 23)
  const [enableAdditional, setEnableAdditional] = useState(sizing.enable_additional_losses || false)
  const [additional, setAdditional] = useState(sizing.additional_losses || 0)
  const [useRoofFaces, setUseRoofFaces] = useState(neg.use_roof_faces || false)
  const [roofFaces, setRoofFaces] = useState<any[]>(
    neg.roof_faces_data?.length ? neg.roof_faces_data : [{ orientation: '', modules: '' }],
  )

  const orientationOptions = efficiencyRule?.orientation_losses || []

  const handleSave = async () => {
    setLoading(true)
    try {
      const newSizing = {
        ...sizing,
        losses: Number(losses),
        enable_additional_losses: enableAdditional,
        additional_losses: Number(additional),
      }
      await updateNegotiation(neg.id, {
        sizing: newSizing,
        use_roof_faces: useRoofFaces,
        roof_faces_data: useRoofFaces ? roofFaces : [],
      })
      toast({ title: 'Salvo com sucesso' })
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
          <DialogTitle>Editar Parâmetros de Geração</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Perdas Nominais (%)</Label>
            <Input type="number" value={losses} readOnly className="bg-muted" />
          </div>
          <div className="flex items-center justify-between">
            <Label>Habilitar Perdas Adicionais</Label>
            <Switch checked={enableAdditional} onCheckedChange={setEnableAdditional} />
          </div>
          {enableAdditional && (
            <div className="space-y-2">
              <Label>Perdas Adicionais (%)</Label>
              <Input
                type="number"
                value={additional}
                onChange={(e) => setAdditional(e.target.value)}
              />
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-4">
            <Label>Considerar faces do telhado</Label>
            <Switch checked={useRoofFaces} onCheckedChange={setUseRoofFaces} />
          </div>
          {useRoofFaces && (
            <div className="space-y-3 bg-muted/30 p-3 rounded-lg border">
              {recommendedModules > 0 && (
                <div className="text-sm text-muted-foreground mb-2">
                  Quantidade ideal de módulos recomendada:{' '}
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
