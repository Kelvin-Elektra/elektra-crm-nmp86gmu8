import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Plus, Trash2, Pencil, Search, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { NOMINAL_VOLTAGES } from '@/types/electric-network'
import { CatalogCsvImportDialog, CatalogImportConfig } from '@/components/CatalogCsvImportDialog'

export function InvertersTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [distributors, setDistributors] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [distFilter, setDistFilter] = useState('all')
  const [importOpen, setImportOpen] = useState(false)

  const initialForm = {
    name: '',
    power: '',
    brand: '',
    distributor_id: '',
    type: 'monofásico',
    voltages: [] as string[],
    warranty: '',
    obs: '',
    overload: '30',
    price: '',
    mppt: '1',
  }
  const [form, setForm] = useState(initialForm)

  const handleNumberChange = (field: string, value: string) => {
    let clean = value.replace(/[^0-9,]/g, '')
    const parts = clean.split(',')
    if (parts.length > 2) {
      clean = parts[0] + ',' + parts.slice(1).join('')
    }
    setForm({ ...form, [field]: clean })
  }

  const parseNumber = (val: string) => {
    if (!val || val.trim() === '') return 0
    return Number(val.replace(/\./g, '').replace(',', '.')) || 0
  }
  const formatNumber = (val: number | string | null | undefined) =>
    val !== null && val !== undefined ? val.toString().replace('.', ',') : ''

  const formatWarrantyYears = (val: any) => {
    if (!val && val !== 0) return '-'
    const str = String(val).trim()
    if (str.toLowerCase().includes('ano')) return str
    const num = Number(str)
    if (!isNaN(num)) {
      return num === 1 ? '1 ano' : `${num} anos`
    }
    return str
  }

  const loadData = async () => {
    if (!user?.company_id) return
    setFetching(true)
    try {
      const [invs, dists] = await Promise.all([
        pb.collection('pv_inverters').getFullList({ expand: 'distributor_id' }),
        pb.collection('pv_distributors').getFullList(),
      ])
      setData(invs)
      setDistributors(dists)
    } finally {
      setFetching(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id || !form.distributor_id) return
    setLoading(true)

    const warrantyNum = form.warranty
      ? parseInt(String(form.warranty).replace(/\D/g, ''), 10)
      : null

    // Manter campo legado 'voltage' preenchido para compatibilidade histórica (ex: "220V" ou "220V, 380V")
    const legacyVoltage =
      form.voltages.length > 0 ? form.voltages.map((v) => `${v}V`).join(', ') : ''

    const payload = {
      name: form.name,
      power: parseNumber(form.power),
      brand: form.brand,
      distributor_id: form.distributor_id,
      type: form.type,
      voltages: form.voltages,
      voltage: legacyVoltage,
      obs: form.obs,
      overload: parseNumber(form.overload),
      price: form.price ? parseNumber(form.price) : null,
      warranty: warrantyNum !== null && !isNaN(warrantyNum) ? `${warrantyNum} anos` : form.warranty,
      mppt: parseNumber(form.mppt),
      company_id: user.company_id,
    }

    try {
      if (editingId) {
        await pb.collection('pv_inverters').update(editingId, payload)
        toast({ title: 'Sucesso', description: 'Inversor atualizado.' })
      } else {
        await pb.collection('pv_inverters').create(payload)
        toast({ title: 'Sucesso', description: 'Inversor adicionado.' })
      }
      resetForm()
      loadData()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar o inversor.' })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (inv: any) => {
    const rawWarranty = inv.warranty ? String(inv.warranty).replace(/\D/g, '') : ''

    // Recupera voltages do array ou do campo legado textual
    let initialVoltages: string[] = []
    if (Array.isArray(inv.voltages) && inv.voltages.length > 0) {
      initialVoltages = inv.voltages.map((v: any) => String(v).replace(/\D/g, '')).filter(Boolean)
    } else if (inv.voltage) {
      const nums = String(inv.voltage).match(/\d+/g) || []
      initialVoltages = Array.from(new Set(nums))
    }

    setForm({
      name: inv.name,
      power: formatNumber(inv.power),
      brand: inv.brand,
      distributor_id: inv.distributor_id,
      type: inv.type,
      voltages: initialVoltages,
      warranty: rawWarranty || inv.warranty || '',
      obs: inv.obs || '',
      overload: formatNumber(inv.overload),
      price: formatNumber(inv.price),
      mppt: formatNumber(inv.mppt),
    })
    setEditingId(inv.id)
  }

  const toggleVoltage = (volt: string) => {
    setForm((prev) => {
      const exists = prev.voltages.includes(volt)
      const next = exists ? prev.voltages.filter((v) => v !== volt) : [...prev.voltages, volt]
      return { ...prev, voltages: next }
    })
  }

  const formatInverterVoltages = (inv: any) => {
    if (Array.isArray(inv.voltages) && inv.voltages.length > 0) {
      return inv.voltages.map((v: any) => `${v}V`).join(' / ')
    }
    if (inv.voltage) {
      return String(inv.voltage).includes('V') ? inv.voltage : `${inv.voltage}V`
    }
    return '-'
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('pv_inverters').delete(id)
      toast({ title: 'Sucesso', description: 'Inversor removido.' })
      loadData()
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao remover.' })
    }
  }

  const resetForm = () => {
    setForm({ ...initialForm, distributor_id: form.distributor_id })
    setEditingId(null)
  }

  const filteredData = data.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.brand.toLowerCase().includes(search.toLowerCase())
    const matchDist = distFilter === 'all' || d.distributor_id === distFilter
    return matchSearch && matchDist
  })

  const invertersImportConfig: CatalogImportConfig = {
    collectionName: 'pv_inverters',
    catalogTitle: 'Inversores Solares',
    templateFilename: 'modelo_inversores_solares.csv',
    headers: [
      'Modelo',
      'Marca',
      'Potencia_kW',
      'Tipo_Fase',
      'Tensoes_Aceitas_V',
      'Preco_R$',
      'Overload_%',
      'MPPT',
      'Garantia_Anos',
      'Distribuidora',
      'Observacoes',
    ],
    sampleRows: [
      [
        'SUN-5K-G03',
        'Deye',
        5,
        'monofásico',
        '220',
        '3850,00',
        30,
        2,
        10,
        'Solfácil',
        'Inversor string com wifi integrado',
      ],
      [
        'MID-15KTL3-X',
        'Growatt',
        15,
        'trifásico',
        '220, 380',
        '8900,00',
        40,
        2,
        10,
        'Genyx',
        'Inversor trifásico comercial',
      ],
    ],
    matchFields: ['name', 'brand'],
    mapRowToPayload: (row, companyId) => {
      const name = (row['Modelo'] || row['name'] || row['Nome'] || '').trim()
      const brand = (row['Marca'] || row['brand'] || '').trim()
      const powerStr = row['Potencia_kW'] || row['power'] || '0'
      const power = parseNumber(powerStr)

      if (!name) return null

      const rawType = (row['Tipo_Fase'] || row['type'] || 'monofásico').toLowerCase()
      const type = rawType.includes('tri') ? 'trifásico' : 'monofásico'

      // Tratar tensões nominais: ex: "220, 380" ou "220"
      const voltStr = row['Tensoes_Aceitas_V'] || row['voltages'] || row['voltage'] || ''
      const matchedNums = String(voltStr).match(/\d+/g) || []
      const voltages = Array.from(new Set(matchedNums))
      const legacyVoltage = voltages.length > 0 ? voltages.map((v) => `${v}V`).join(', ') : ''

      // Tenta achar distribuidora
      const distName = (row['Distribuidora'] || '').trim().toLowerCase()
      let distId = form.distributor_id || distributors[0]?.id || null
      if (distName) {
        const found = distributors.find((d) => d.name.trim().toLowerCase() === distName)
        if (found) distId = found.id
      }

      const warrantyStr = (row['Garantia_Anos'] || row['warranty'] || '').trim()
      const wNum = warrantyStr ? parseInt(String(warrantyStr).replace(/\D/g, ''), 10) : null
      const warranty = wNum ? `${wNum} anos` : warrantyStr

      return {
        company_id: companyId,
        name,
        brand: brand || 'Genérica',
        power,
        type,
        voltages,
        voltage: legacyVoltage,
        distributor_id: distId,
        price: row['Preco_R$'] ? parseNumber(row['Preco_R$']) : null,
        overload: row['Overload_%'] ? parseNumber(row['Overload_%']) : 30,
        mppt: row['MPPT'] ? parseNumber(row['MPPT']) : 1,
        warranty,
        obs: row['Observacoes'] || row['obs'] || '',
      }
    },
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Catálogo de Inversores</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImportOpen(true)}
          className="gap-2 text-xs border-primary/40 text-primary hover:bg-primary/5"
        >
          <FileSpreadsheet className="w-4 h-4" /> Importar Planilha
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleAdd}
          className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start bg-muted/30 p-5 rounded-xl border border-border/50"
        >
          <div className="space-y-2">
            <Label className="font-semibold">Distribuidora</Label>
            <Select
              value={form.distributor_id}
              onValueChange={(v) => setForm({ ...form, distributor_id: v })}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {distributors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Nome/Modelo</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Potência (kW)</Label>
            <Input
              required
              type="text"
              value={form.power}
              onChange={(e) => handleNumberChange('power', e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Marca</Label>
            <Input
              required
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Fase</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monofásico">Monofásico</SelectItem>
                <SelectItem value="trifásico">Trifásico</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Tensões Nominais Aceitas</Label>
              <span className="text-xs text-muted-foreground">
                {form.voltages.length === 0
                  ? 'Nenhuma selecionada'
                  : `${form.voltages.length} ${form.voltages.length === 1 ? 'tensão' : 'tensões'}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2 p-2 rounded-lg border bg-background">
              {NOMINAL_VOLTAGES.map((volt) => {
                const checked = form.voltages.includes(volt)
                return (
                  <label
                    key={volt}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleVoltage(volt)}
                      className="h-3.5 w-3.5"
                    />
                    <span>{volt}V</span>
                  </label>
                )
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Overload Max (%)</Label>
            <Input
              required
              type="text"
              value={form.overload}
              onChange={(e) => handleNumberChange('overload', e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">MPPT</Label>
            <Input
              required
              type="text"
              value={form.mppt}
              onChange={(e) => handleNumberChange('mppt', e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Garantia (anos)</Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="50"
                placeholder="Ex: 10"
                value={form.warranty}
                onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                className="bg-background pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                anos
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="font-semibold">Preço</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                R$
              </span>
              <Input
                type="text"
                value={form.price}
                onChange={(e) => handleNumberChange('price', e.target.value)}
                className="pl-9 bg-background"
                placeholder="0,00"
              />
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="font-semibold">Observações</Label>
            <Input
              value={form.obs}
              onChange={(e) => setForm({ ...form, obs: e.target.value })}
              className="bg-background"
            />
          </div>

          <div className="md:col-span-4 flex justify-end gap-2 mt-2">
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {editingId ? (
                'Salvar Alterações'
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" /> Salvar Inversor
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por modelo ou marca..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={distFilter} onValueChange={setDistFilter}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Filtrar Distribuidora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Distribuidoras</SelectItem>
              {distributors.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">Nome/Modelo</th>
                <th className="p-3 font-medium">Marca</th>
                <th className="p-3 font-medium">Potência</th>
                <th className="p-3 font-medium">Fase/Tensão</th>
                <th className="p-3 font-medium">Overload/MPPT</th>
                <th className="p-3 font-medium">Garantia</th>
                <th className="p-3 font-medium">Preço</th>
                <th className="p-3 font-medium">Distribuidora</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fetching ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-3 text-right">
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-foreground">
                    Nenhum inversor encontrado.
                  </td>
                </tr>
              ) : (
                filteredData.map((d) => (
                  <tr key={d.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium">{d.name}</td>
                    <td className="p-3">{d.brand}</td>
                    <td className="p-3">{formatNumber(d.power)} kW</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="capitalize">{d.type}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatInverterVoltages(d)}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      {formatNumber(d.overload)}% / {formatNumber(d.mppt)}x
                    </td>
                    <td className="p-3">{formatWarrantyYears(d.warranty)}</td>
                    <td className="p-3">
                      {d.price
                        ? `R$ ${d.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </td>
                    <td className="p-3">{d.expand?.distributor_id?.name}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(d)}>
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      <CatalogCsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        config={invertersImportConfig}
        companyId={user?.company_id || ''}
        onSuccess={loadData}
      />
    </Card>
  )
}
