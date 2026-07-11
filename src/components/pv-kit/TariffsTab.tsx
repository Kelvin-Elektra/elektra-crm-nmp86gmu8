import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { Plus, Pencil, Trash2, Info } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { NumericInput } from '@/components/ui/numeric-input'
import { CONSUMER_CATEGORIES } from '@/lib/financial-analysis'

const ICMS_EXEMPTIONS = [
  { value: 'none', label: 'Sem Isenção' },
  { value: 'te', label: 'Isento TE' },
  { value: 'tusd', label: 'Isento TUSD' },
  { value: 'both', label: 'Isento Ambos' },
]

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

const EMPTY_FORM = {
  utility_id: '',
  class: '',
  network_type: '',
  voltage: '',
  te: 0,
  tusd: 0,
  icms_rate: 0,
  icms_exemption: 'none',
  fio_b_value: 0.22,
}

export function TariffsTab({ companyId: propCompanyId }: { companyId?: string }) {
  const { user } = useAuth()
  const companyId = propCompanyId || user?.company_id
  const { toast } = useToast()

  const [utilities, setUtilities] = useState<any[]>([])
  const [rules, setRules] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<any>({ ...EMPTY_FORM })

  const loadData = async () => {
    if (!companyId) return
    try {
      const utils = await pb.collection('pv_utilities').getFullList({
        filter: `company_id='${companyId}'`,
      })
      setUtilities(utils)
      const tariffRules = await pb.collection('pv_tariff_rules').getFullList({
        filter: `company_id='${companyId}'`,
        expand: 'utility_id',
      })
      setRules(tariffRules)
    } catch {
      /* noop */
    }
  }

  useEffect(() => {
    loadData()
  }, [companyId])

  const handleAdd = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setOpen(true)
  }

  const handleEdit = (rule: any) => {
    setEditingId(rule.id)
    setForm({
      utility_id: rule.utility_id || '',
      class: rule.class || '',
      network_type: rule.network_type || '',
      voltage: rule.voltage || '',
      te: Number(rule.te) || 0,
      tusd: Number(rule.tusd) || 0,
      icms_rate: Number(rule.icms_rate) || 0,
      icms_exemption: rule.icms_exemption || 'none',
      fio_b_value: Number(rule.fio_b_value) || 0,
    })
    setOpen(true)
  }

  const handleSave = async () => {
    try {
      const data = { ...form, company_id: companyId }
      if (editingId) {
        await pb.collection('pv_tariff_rules').update(editingId, data)
      } else {
        await pb.collection('pv_tariff_rules').create(data)
      }
      toast({ description: 'Tarifa salva com sucesso' })
      setOpen(false)
      loadData()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao salvar tarifa' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('pv_tariff_rules').delete(id)
      toast({ description: 'Tarifa excluída' })
      loadData()
    } catch {
      toast({ variant: 'destructive', description: 'Erro ao excluir' })
    }
  }

  const getUtilityName = (id: string) => utilities.find((u) => u.id === id)?.name || 'N/A'

  const updateForm = (field: string, value: any) =>
    setForm((prev: any) => ({ ...prev, [field]: value }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Regras de Tarifa</CardTitle>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="w-4 h-4 mr-2" /> Adicionar
        </Button>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma tarifa cadastrada. Clique em "Adicionar" para criar.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concessionária</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>TE</TableHead>
                <TableHead>TUSD</TableHead>
                <TableHead>ICMS</TableHead>
                <TableHead>Isenção</TableHead>
                <TableHead>Fio B</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{getUtilityName(rule.utility_id)}</TableCell>
                  <TableCell>{rule.class}</TableCell>
                  <TableCell>{BRL.format(Number(rule.te) || 0)}</TableCell>
                  <TableCell>{BRL.format(Number(rule.tusd) || 0)}</TableCell>
                  <TableCell>{Number(rule.icms_rate) || 0}%</TableCell>
                  <TableCell>
                    {ICMS_EXEMPTIONS.find((e) => e.value === rule.icms_exemption)?.label || '-'}
                  </TableCell>
                  <TableCell>{BRL.format(Number(rule.fio_b_value) || 0)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Tarifa' : 'Nova Tarifa'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Concessionária</Label>
              <Select value={form.utility_id} onValueChange={(v) => updateForm('utility_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {utilities.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Classe de Consumo</Label>
              <Select value={form.class} onValueChange={(v) => updateForm('class', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CONSUMER_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>TE (R$/kWh)</Label>
              <NumericInput
                value={form.te}
                onValueChange={(v) => updateForm('te', v)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>TUSD (R$/kWh)</Label>
              <NumericInput
                value={form.tusd}
                onValueChange={(v) => updateForm('tusd', v)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Alíquota ICMS (%)</Label>
              <NumericInput
                value={form.icms_rate}
                onValueChange={(v) => updateForm('icms_rate', v)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Isenção ICMS</Label>
              <Select
                value={form.icms_exemption}
                onValueChange={(v) => updateForm('icms_exemption', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICMS_EXEMPTIONS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label className="flex items-center gap-1">
                Fio B (R$/kWh)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Insira o valor integral do Fio B. O sistema aplica o escalonamento anual
                    automaticamente (2026: 60%, 2027: 75%, 2028: 90%, 2029+: 100%).
                  </TooltipContent>
                </Tooltip>
              </Label>
              <NumericInput
                value={form.fio_b_value}
                onValueChange={(v) => updateForm('fio_b_value', v)}
                placeholder="0.22"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
