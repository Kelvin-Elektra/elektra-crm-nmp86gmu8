import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Network, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { updateNegotiation } from '@/services/db'

export interface UcBeneficiaryItem {
  name: string
  percentage: number
}

interface BeneficiariesCardProps {
  neg: any
  reload?: () => void
}

export function BeneficiariesCard({ neg, reload }: BeneficiariesCardProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const parseBeneficiaries = (raw: any): UcBeneficiaryItem[] => {
    if (!raw) return []
    try {
      const list = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Array.isArray(list)) {
        return list
          .filter((item) => item && typeof item === 'object')
          .map((item) => ({
            name: String(item.name || '').trim(),
            percentage: Number(item.percentage) || 0,
          }))
      }
    } catch {
      /* intentionally ignored */
    }
    return []
  }

  const savedList = parseBeneficiaries(neg?.uc_beneficiaries)
  const [list, setList] = useState<UcBeneficiaryItem[]>(savedList)

  useEffect(() => {
    setList(parseBeneficiaries(neg?.uc_beneficiaries))
  }, [neg?.uc_beneficiaries])

  const handleOpenModal = () => {
    const current = parseBeneficiaries(neg?.uc_beneficiaries)
    setList(current.length > 0 ? current : [{ name: '', percentage: 100 }])
    setOpen(true)
  }

  const handleAddLine = () => {
    setList((prev) => [...prev, { name: '', percentage: 0 }])
  }

  const handleRemoveLine = (index: number) => {
    setList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleChangeName = (index: number, val: string) => {
    setList((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], name: val }
      return copy
    })
  }

  const handleChangePercentage = (index: number, val: string) => {
    const num = Math.min(100, Math.max(0, Number(val) || 0))
    setList((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], percentage: num }
      return copy
    })
  }

  const totalPercentage = list.reduce((acc, item) => acc + (Number(item.percentage) || 0), 0)

  const handleSave = async () => {
    setLoading(true)
    try {
      const cleaned = list
        .filter((item) => item.name.trim().length > 0)
        .map((item) => ({
          name: item.name.trim(),
          percentage: Number(item.percentage) || 0,
        }))

      await updateNegotiation(neg.id, {
        uc_beneficiaries: cleaned,
      })

      toast({ description: 'Unidades beneficiárias salvas com sucesso' })
      setOpen(false)
      reload?.()
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: e.message || 'Não foi possível salvar as unidades beneficiárias.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" /> Unidades Beneficiárias
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={handleOpenModal}>
          <Pencil className="h-4 w-4 mr-2" /> Editar
        </Button>
      </CardHeader>
      <CardContent className="mt-2 space-y-2">
        {savedList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma unidade beneficiária cadastrada. Toda a compensação fica na UC principal (100%).
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b">
              <span>Unidade / Identificação</span>
              <span>Créditos</span>
            </div>
            {savedList.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                  {item.name}
                </span>
                <Badge variant="secondary" className="shrink-0 font-mono">
                  {item.percentage}%
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Unidades Beneficiárias</DialogTitle>
            <VisuallyHidden>
              <DialogDescription>
                Configure as UCs beneficiárias para distribuição dos créditos solares gerados.
              </DialogDescription>
            </VisuallyHidden>
          </DialogHeader>

          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Clique abaixo para adicionar uma unidade beneficiária.
              </p>
            ) : (
              list.map((item, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      UC ou Nome da Unidade {index + 1}
                    </Label>
                    <Input
                      placeholder="Ex: Sítio Recanto UC 112233445"
                      value={item.name}
                      onChange={(e) => handleChangeName(index, e.target.value)}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs text-muted-foreground">Crédito (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={item.percentage}
                      onChange={(e) => handleChangePercentage(index, e.target.value)}
                    />
                  </div>
                  <div className="pt-5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveLine(index)}
                      className="text-muted-foreground hover:text-destructive h-9 w-9"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLine}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" /> Adicionar Unidade
              </Button>

              <div className="text-xs font-medium flex items-center gap-2">
                <span className="text-muted-foreground">Total:</span>
                <span
                  className={
                    totalPercentage === 100
                      ? 'text-emerald-600 font-semibold'
                      : 'text-amber-600 font-semibold'
                  }
                >
                  {totalPercentage}%
                </span>
              </div>
            </div>
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
