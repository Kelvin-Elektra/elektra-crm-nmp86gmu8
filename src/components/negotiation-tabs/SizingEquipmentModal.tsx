import { useState, useEffect } from 'react'
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
import pb from '@/lib/pocketbase/client'

export function SizingEquipmentModal({ open, onOpenChange, neg, reload, recommendedModules }: any) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const sizing = neg.sizing || {}

  const [distributors, setDistributors] = useState<any[]>([])
  const [modules, setModules] = useState<any[]>([])
  const [inverters, setInverters] = useState<any[]>([])

  const [selectedDist, setSelectedDist] = useState(sizing.selected_distributor_id || 'none')
  const [selectedMod, setSelectedMod] = useState(sizing.selected_module_id || 'none')
  const [moduleQty, setModuleQty] = useState(sizing.module_qty || '')

  const initialInvs = sizing.inverters?.length
    ? sizing.inverters
    : sizing.selected_inverter_id
      ? [{ id: sizing.selected_inverter_id, qty: 1 }]
      : []
  const [selectedInvs, setSelectedInvs] = useState<any[]>(initialInvs)

  useEffect(() => {
    if (open && neg.company_id) {
      Promise.all([
        pb.collection('pv_distributors').getFullList({ filter: `company_id='${neg.company_id}'` }),
        pb
          .collection('pv_modules')
          .getFullList({ filter: `company_id='${neg.company_id}'`, sort: '-power' }),
        pb
          .collection('pv_inverters')
          .getFullList({ filter: `company_id='${neg.company_id}'`, sort: '-power' }),
      ]).then(([d, m, i]) => {
        setDistributors(d)
        setModules(m)
        setInverters(i)
      })
    }
  }, [open, neg.company_id])

  const filteredMods =
    selectedDist === 'none' ? [] : modules.filter((m) => m.distributor_id === selectedDist)
  const filteredInvs =
    selectedDist === 'none' ? [] : inverters.filter((i) => i.distributor_id === selectedDist)

  const handleSave = async () => {
    setLoading(true)
    try {
      const cleanInvs = selectedInvs.filter((i) => i.id !== 'none' && i.qty > 0)
      const mod = modules.find((m) => m.id === selectedMod)
      const powerW = mod?.power || 0
      const actualQty = Number(moduleQty) || 0
      const kitPowerKwp = (actualQty * powerW) / 1000

      const newSizing = {
        ...sizing,
        selected_distributor_id: selectedDist === 'none' ? null : selectedDist,
        selected_module_id: selectedMod === 'none' ? null : selectedMod,
        inverters: cleanInvs,
        selected_inverter_id: cleanInvs.length > 0 ? cleanInvs[0].id : null,
        module_qty: actualQty,
        kit_power_kwp: kitPowerKwp,
        totalPower: kitPowerKwp,
      }

      await updateNegotiation(neg.id, { sizing: newSizing })
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
          <DialogTitle>Editar Equipamentos</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Distribuidora</Label>
            <Select
              value={selectedDist}
              onValueChange={(v) => {
                setSelectedDist(v)
                setSelectedMod('none')
                setSelectedInvs([])
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione uma distribuidora</SelectItem>
                {distributors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Módulo Fotovoltaico</Label>
            <Select
              value={selectedMod}
              onValueChange={setSelectedMod}
              disabled={selectedDist === 'none'}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não selecionado</SelectItem>
                {filteredMods.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.brand} - {m.name} ({m.power}W)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!neg.use_roof_faces && (
            <div className="space-y-2">
              <Label>Quantidade de Módulos</Label>
              <Input
                type="number"
                value={moduleQty}
                onChange={(e) => setModuleQty(e.target.value)}
              />
              {recommendedModules > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Quantidade recomendada pelo sistema:{' '}
                  <strong className="text-foreground">{recommendedModules}</strong>
                </p>
              )}
            </div>
          )}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex justify-between items-center">
              <Label>Inversores</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedInvs([...selectedInvs, { id: 'none', qty: 1 }])}
                disabled={selectedDist === 'none'}
              >
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </div>
            {selectedInvs.map((inv, idx) => (
              <div key={idx} className="flex gap-2">
                <Select
                  value={inv.id}
                  onValueChange={(v) => {
                    const arr = [...selectedInvs]
                    arr[idx].id = v
                    setSelectedInvs(arr)
                  }}
                >
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione</SelectItem>
                    {filteredInvs.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.brand} ({i.power}kW)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="w-20 h-9"
                  value={inv.qty}
                  onChange={(e) => {
                    const arr = [...selectedInvs]
                    arr[idx].qty = Number(e.target.value)
                    setSelectedInvs(arr)
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive"
                  onClick={() => setSelectedInvs(selectedInvs.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
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
