import { useState, useMemo } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { updateNegotiation } from '@/services/db'
import { useToast } from '@/hooks/use-toast'

export function SizingGenerationModal({
  open,
  onOpenChange,
  neg,
  reload,
  efficiencyRule,
  recommendedModules,
  avgConsumption,
  modulePowerW,
  hspData,
}: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const sizing = neg.sizing || {}

  const losses = sizing.losses ?? (efficiencyRule?.nominal_loss || 23)
  const [enableAdditional, setEnableAdditional] = useState(sizing.enable_additional_losses || false)
  const [additional, setAdditional] = useState(sizing.additional_losses || 0)

  const orientationOptions = efficiencyRule?.orientation_losses || []
  const useRoofFaces = neg.use_roof_faces || false
  const roofFaces = neg.roof_faces_data || []

  const estGeneration = useMemo(() => {
    const totalLossesNum = Number(losses) + (enableAdditional ? Number(additional) : 0)
    const totalLossFactor = 1 - totalLossesNum / 100
    const hspNum = hspData?.annual_avg || 4.94
    let gen = 0

    if (useRoofFaces) {
      roofFaces.forEach((f: any) => {
        const facePowerKwp = ((Number(f.modules) || 0) * modulePowerW) / 1000
        const o = orientationOptions.find((opt: any) => opt.orientation === f.orientation)
        const orientLoss = o ? Number(o.loss) || 0 : 0
        gen += hspNum * facePowerKwp * totalLossFactor * (1 - orientLoss / 100) * 30.41
      })
    } else {
      const qty = Number(sizing.module_qty) || recommendedModules
      const kitPowerKwp = (qty * modulePowerW) / 1000
      gen = hspNum * kitPowerKwp * totalLossFactor * 30.41
    }
    return gen
  }, [
    losses,
    enableAdditional,
    additional,
    useRoofFaces,
    roofFaces,
    modulePowerW,
    hspData,
    orientationOptions,
    sizing,
    recommendedModules,
  ])

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
          <DialogDescription className="sr-only">
            Ajuste os parâmetros de perdas e geração.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between border p-3 rounded-lg bg-card mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Consumo do Cliente</p>
              <p className="font-bold">{avgConsumption || 0} kWh/mês</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Geração Estimada</p>
              <p
                className={`font-bold ${estGeneration < (avgConsumption || 0) ? 'text-destructive' : 'text-green-600'}`}
              >
                {Math.round(estGeneration)} kWh/mês
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Perdas Nominais (%)</Label>
            <Input type="number" value={losses} readOnly className="bg-muted pointer-events-none" />
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
