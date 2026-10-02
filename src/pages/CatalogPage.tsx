import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Navigate } from 'react-router-dom'
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Wrench,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { getCatalogItems, CatalogItemRecord } from '@/services/catalog'

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export default function CatalogPage() {
  const { user, realUser } = useAuth()
  const { toast } = useToast()

  const isElektraAdmin = realUser?.role === 'User_elektra'
  const isCompanyAdmin = user?.role_company === 'admin' || user?.role === 'User_owner'
  const isAdmin = isElektraAdmin || isCompanyAdmin

  const [items, setItems] = useState<CatalogItemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'produto' | 'servico'>('all')

  // Modal de edição / criação
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatalogItemRecord | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    item_type: 'produto' as 'produto' | 'servico',
    price: 0,
    unit: 'un',
    active: true,
  })

  const companyId = user?.company_id

  const loadItems = async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const data = await getCatalogItems(companyId)
      setItems(data)
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar catálogo',
        description: e.message,
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [companyId])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.unit || '').toLowerCase().includes(search.toLowerCase())

      const matchesType = typeFilter === 'all' || item.item_type === typeFilter
      return matchesSearch && matchesType
    })
  }, [items, search, typeFilter])

  const counts = useMemo(() => {
    const total = items.length
    const produtos = items.filter((i) => i.item_type === 'produto').length
    const servicos = items.filter((i) => i.item_type === 'servico').length
    return { total, produtos, servicos }
  }, [items])

  const handleOpenModal = (item?: CatalogItemRecord) => {
    if (!isAdmin) return
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        description: item.description || '',
        item_type: item.item_type || 'produto',
        price: Number(item.price) || 0,
        unit: item.unit || 'un',
        active: item.active !== false,
      })
    } else {
      setEditingItem(null)
      setFormData({
        name: '',
        description: '',
        item_type: 'produto',
        price: 0,
        unit: 'un',
        active: true,
      })
    }
    setItemModalOpen(true)
  }

  const handleSaveItem = async () => {
    if (!isAdmin) return
    if (!companyId || !formData.name.trim() || formData.price <= 0) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Informe o nome e um preço válido.',
      })
      return
    }

    setSaving(true)
    try {
      const payload = {
        company_id: companyId,
        name: formData.name.trim(),
        description: formData.description.trim(),
        item_type: formData.item_type,
        price: Number(formData.price),
        unit: formData.unit.trim() || 'un',
        active: formData.active,
      }

      if (editingItem) {
        await pb.collection('catalog_items').update(editingItem.id, payload)
        toast({ title: 'Item atualizado' })
      } else {
        await pb.collection('catalog_items').create(payload)
        toast({ title: 'Item cadastrado' })
      }

      setItemModalOpen(false)
      loadItems()
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: e.message,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteItem = async (id: string, name: string) => {
    if (!isAdmin) return
    if (!confirm(`Remover "${name}" do catálogo?`)) return
    try {
      await pb.collection('catalog_items').delete(id)
      toast({ title: 'Item removido' })
      loadItems()
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: e.message,
      })
    }
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in pb-16 w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight">Produtos & Serviços</h2>
            {!isAdmin && (
              <Badge variant="outline" className="text-xs text-muted-foreground ml-2">
                Visualização
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Catálogo de itens da companhia disponíveis para orçamentos comerciais.
          </p>
        </div>

        {isAdmin ? (
          <Button onClick={() => handleOpenModal()} className="gap-2 self-start sm:self-auto">
            <Plus className="w-4 h-4" /> Novo Item
          </Button>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground self-start sm:self-auto">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            Edição restrita a administradores
          </div>
        )}
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total no Catálogo</p>
            <p className="text-2xl font-bold">{counts.total}</p>
          </div>
          <Package className="w-8 h-8 text-primary/40" />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Produtos</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {counts.produtos}
            </p>
          </div>
          <Package className="w-8 h-8 text-amber-500/40" />
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Serviços & Mão de Obra</p>
            <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{counts.servicos}</p>
          </div>
          <Wrench className="w-8 h-8 text-sky-500/40" />
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, descrição ou unidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <Tabs
              value={typeFilter}
              onValueChange={(v: any) => setTypeFilter(v)}
              className="w-auto"
            >
              <TabsList className="h-9 bg-muted/60">
                <TabsTrigger value="all" className="text-xs px-3">
                  Todos ({counts.total})
                </TabsTrigger>
                <TabsTrigger value="produto" className="text-xs px-3">
                  Produtos ({counts.produtos})
                </TabsTrigger>
                <TabsTrigger value="servico" className="text-xs px-3">
                  Serviços ({counts.servicos})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Carregando catálogo...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              {search || typeFilter !== 'all'
                ? 'Nenhum item encontrado com os filtros atuais.'
                : 'Nenhum item cadastrado no catálogo.'}
            </div>
          ) : (
            <div className="divide-y text-sm">
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted/30 text-xs font-semibold text-muted-foreground">
                <div className="col-span-6 sm:col-span-5">Item</div>
                <div className="col-span-2 text-center">Tipo</div>
                <div className="col-span-2 text-center">Unidade</div>
                <div className="col-span-2 sm:col-span-3 text-right">Preço</div>
              </div>

              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 p-3 sm:p-4 items-center hover:bg-muted/15 transition-colors"
                >
                  <div className="col-span-6 sm:col-span-5 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{item.name}</span>
                      {item.active === false && (
                        <Badge variant="secondary" className="text-[10px]">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2 text-center">
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        item.item_type === 'servico'
                          ? 'border-sky-300 text-sky-700 dark:text-sky-300'
                          : 'border-amber-300 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {item.item_type === 'servico' ? 'Serviço' : 'Produto'}
                    </Badge>
                  </div>

                  <div className="col-span-2 text-center text-xs text-muted-foreground font-mono">
                    {item.unit || 'un'}
                  </div>

                  <div className="col-span-2 sm:col-span-3 flex items-center justify-end gap-3 text-right">
                    <span className="font-bold text-primary">{BRL(item.price)}</span>

                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleOpenModal(item)}
                          title="Editar item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          title="Excluir item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Criação / Edição (Admin-only) */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item no Catálogo'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome *</Label>
              <Input
                placeholder="Ex: Padrão Monofásico 100A, Instalação DPS..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo *</Label>
                <Select
                  value={formData.item_type}
                  onValueChange={(val: any) => setFormData({ ...formData, item_type: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produto">Produto</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Unidade *</Label>
                <Input
                  placeholder="un, m, serviço, hora"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Preço Padrão (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) || 0 })}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descrição</Label>
              <Input
                placeholder="Especificações ou detalhes opcionais..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItemModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSaveItem} disabled={saving} className="gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
