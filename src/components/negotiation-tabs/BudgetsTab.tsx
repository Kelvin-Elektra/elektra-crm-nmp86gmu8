import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  Trash2,
  Plus,
  FileDown,
  ShoppingBag,
  ListPlus,
  Loader2,
  Package,
  Wrench,
  HelpCircle,
} from 'lucide-react'
import {
  getCatalogItems,
  getNegotiationQuoteItems,
  CatalogItemRecord,
  NegotiationQuoteItemRecord,
} from '@/services/catalog'
import { generateQuote1PagePdf } from '@/lib/quote-pdf'

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)

export function BudgetsTab({ neg }: { neg: any }) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [catalog, setCatalog] = useState<CatalogItemRecord[]>([])
  const [quoteItems, setQuoteItems] = useState<NegotiationQuoteItemRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Observações do orçamento
  const [quoteNotes, setQuoteNotes] = useState<string>(
    neg.quote_notes || 'Pagamento: 50% na aprovação e 50% na conclusão. Validade: 10 dias.',
  )
  const [savingNotes, setSavingNotes] = useState(false)

  // Modal para adicionar item do catálogo ou personalizado
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('')
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    item_type: 'produto' as 'produto' | 'servico',
    unit: 'un',
    unit_price: 0,
    quantity: 1,
    notes: '',
  })

  // Modal para gerenciar o Catálogo Geral da empresa
  const [catalogModalOpen, setCatalogModalOpen] = useState(false)
  const [catalogItemForm, setCatalogItemForm] = useState({
    name: '',
    description: '',
    item_type: 'produto' as 'produto' | 'servico',
    unit: 'un',
    price: 0,
    active: true,
  })
  const [savingCatalogItem, setSavingCatalogItem] = useState(false)

  const companyId = user?.company_id

  // Carrega itens da negociação e do catálogo
  const loadData = async () => {
    if (!neg.id) return
    try {
      const [items, cat] = await Promise.all([
        getNegotiationQuoteItems(neg.id),
        companyId ? getCatalogItems(companyId) : Promise.resolve([]),
      ])
      setQuoteItems(items)
      setCatalog(cat)
    } catch (e: any) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [neg.id, companyId])

  // Ao selecionar um item do catálogo no select
  const handleSelectCatalogItem = (catalogId: string) => {
    setSelectedCatalogId(catalogId)
    if (catalogId === 'custom') {
      setItemForm({
        name: '',
        description: '',
        item_type: 'produto',
        unit: 'un',
        unit_price: 0,
        quantity: 1,
        notes: '',
      })
      return
    }

    const catItem = catalog.find((c) => c.id === catalogId)
    if (catItem) {
      setItemForm({
        name: catItem.name,
        description: catItem.description || '',
        item_type: catItem.item_type || 'produto',
        unit: catItem.unit || 'un',
        unit_price: Number(catItem.price) || 0,
        quantity: 1,
        notes: '',
      })
    }
  }

  // Adicionar item ao orçamento
  const handleAddQuoteItem = async () => {
    if (!itemForm.name.trim() || itemForm.unit_price <= 0 || itemForm.quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Informe o nome do item, quantidade e valor unitário válido.',
      })
      return
    }

    setLoading(true)
    try {
      const totalPrice = itemForm.unit_price * itemForm.quantity
      await pb.collection('negotiation_quote_items').create({
        company_id: companyId,
        negotiation_id: neg.id,
        catalog_item_id:
          selectedCatalogId !== 'custom' && selectedCatalogId ? selectedCatalogId : null,
        name: itemForm.name,
        description: itemForm.description,
        item_type: itemForm.item_type,
        unit: itemForm.unit,
        unit_price: itemForm.unit_price,
        quantity: itemForm.quantity,
        total_price: totalPrice,
        notes: itemForm.notes,
      })

      toast({ title: 'Item adicionado ao orçamento' })
      setAddItemModalOpen(false)
      loadData()
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar item',
        description: e.message,
      })
    } finally {
      setLoading(false)
    }
  }

  // Atualizar quantidade inline
  const handleUpdateQuantity = async (id: string, newQty: number, unitPrice: number) => {
    if (newQty <= 0) return
    try {
      const totalPrice = newQty * unitPrice
      await pb.collection('negotiation_quote_items').update(id, {
        quantity: newQty,
        total_price: totalPrice,
      })
      setQuoteItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, quantity: newQty, total_price: totalPrice } : i)),
      )
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar quantidade',
        description: e.message,
      })
    }
  }

  // Remover item do orçamento
  const handleRemoveQuoteItem = async (id: string) => {
    try {
      await pb.collection('negotiation_quote_items').delete(id)
      setQuoteItems((prev) => prev.filter((i) => i.id !== id))
      toast({ title: 'Item removido do orçamento' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao remover item', description: e.message })
    }
  }

  // Salvar observações do orçamento
  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await pb.collection('negotiations').update(neg.id, {
        quote_notes: quoteNotes,
      })
      toast({ title: 'Observações do orçamento atualizadas' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar observações', description: e.message })
    } finally {
      setSavingNotes(false)
    }
  }

  // Criar novo produto/serviço no Catálogo da Empresa
  const handleCreateCatalogItem = async () => {
    if (!companyId || !catalogItemForm.name.trim() || catalogItemForm.price <= 0) {
      toast({
        variant: 'destructive',
        title: 'Preencha o nome e o preço do item',
      })
      return
    }

    setSavingCatalogItem(true)
    try {
      await pb.collection('catalog_items').create({
        company_id: companyId,
        ...catalogItemForm,
      })
      toast({ title: 'Item cadastrado no catálogo' })
      setCatalogItemForm({
        name: '',
        description: '',
        item_type: 'produto',
        unit: 'un',
        price: 0,
        active: true,
      })
      setCatalogModalOpen(false)
      loadData()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao cadastrar item', description: e.message })
    } finally {
      setSavingCatalogItem(false)
    }
  }

  // Total do Orçamento
  const totalQuoteAmount = quoteItems.reduce((acc, i) => acc + (Number(i.total_price) || 0), 0)

  // Gerar e Baixar PDF de 1 página
  const handleGeneratePdf = async () => {
    if (quoteItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Orçamento vazio',
        description: 'Adicione ao menos um item para gerar o PDF.',
      })
      return
    }

    setGeneratingPdf(true)
    try {
      // Buscar dados da empresa e lead/cliente
      let companyName = 'Elektra Engenharia'
      let companyCnpj = ''
      let companyPhone = ''
      let companyEmail = ''

      if (companyId) {
        try {
          const comp = await pb.collection('companies').getOne(companyId)
          companyName = comp.name || companyName
          companyCnpj = comp.cnpj || ''
          companyPhone = comp.phone || ''
          companyEmail = comp.email || ''
        } catch {
          /* intentionally ignored */
        }
      }

      const clientName =
        neg.expand?.lead_id?.name ||
        neg.client_name ||
        neg.expand?.contact_id?.name ||
        neg.title ||
        'Cliente'
      const clientDoc = neg.expand?.lead_id?.document || neg.client_cpf_cnpj || ''
      const clientPhone = neg.expand?.lead_id?.phone || neg.client_phone || ''
      const clientEmail = neg.expand?.lead_id?.email || ''
      const clientAddr = neg.address_street || neg.expand?.lead_id?.address || ''
      const clientCity = neg.address_city || neg.city || ''
      const clientState = neg.address_state || neg.state || ''

      const pdfBlob = await generateQuote1PagePdf({
        company: {
          name: companyName,
          cnpj: companyCnpj,
          phone: companyPhone,
          email: companyEmail,
        },
        client: {
          name: clientName,
          document: clientDoc,
          phone: clientPhone,
          email: clientEmail,
          address: clientAddr,
          city: clientCity,
          state: clientState,
        },
        negotiationTitle: neg.title || 'Orçamento de Produtos e Serviços',
        items: quoteItems.map((i) => ({
          name: i.name,
          description: i.description,
          item_type: i.item_type,
          unit: i.unit,
          unit_price: Number(i.unit_price) || 0,
          quantity: Number(i.quantity) || 1,
          total_price: Number(i.total_price) || 0,
        })),
        totalAmount: totalQuoteAmount,
        notes: quoteNotes,
      })

      // Download do PDF
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Orcamento_${(neg.title || 'Elektra').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'PDF gerado com sucesso!',
        description: 'Orçamento de 1 página pronto para envio ao cliente.',
      })
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar PDF',
        description: e.message || 'Falha ao compilar documento.',
      })
    } finally {
      setGeneratingPdf(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <CardTitle className="text-xl">
                  Orçamento Comercial de Produtos & Serviços
                </CardTitle>
              </div>
              <CardDescription>
                Adicione produtos, equipamentos ou serviços complementares (padrão de entrada,
                câmeras, laudos, mão de obra) e gere um PDF de 1 página profissional.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCatalogModalOpen(true)}
                className="gap-2 text-xs"
              >
                <Package className="w-4 h-4 text-primary" /> Catálogo da Empresa
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedCatalogId('')
                  setItemForm({
                    name: '',
                    description: '',
                    item_type: 'produto',
                    unit: 'un',
                    unit_price: 0,
                    quantity: 1,
                    notes: '',
                  })
                  setAddItemModalOpen(true)
                }}
                className="gap-2 text-xs"
              >
                <Plus className="w-4 h-4" /> Adicionar Item
              </Button>

              <Button
                variant="default"
                size="sm"
                disabled={quoteItems.length === 0 || generatingPdf}
                onClick={handleGeneratePdf}
                className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {generatingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                Gerar PDF (1 página)
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Tabela de Itens */}
        <CardContent className="p-0">
          {quoteItems.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground border-t">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              Nenhum item adicionado a este orçamento ainda.
              <p className="text-xs text-muted-foreground/80 mt-1">
                Clique no botão "Adicionar Item" acima para incluir produtos ou serviços.
              </p>
            </div>
          ) : (
            <div className="divide-y border-t">
              <div className="grid grid-cols-12 gap-2 p-3 bg-muted/40 text-xs font-semibold text-muted-foreground">
                <div className="col-span-5 sm:col-span-6">Item / Descrição</div>
                <div className="col-span-2 text-center">Tipo</div>
                <div className="col-span-2 text-center">Qtd.</div>
                <div className="col-span-3 sm:col-span-2 text-right">Total</div>
              </div>

              {quoteItems.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-12 gap-2 p-3 sm:p-4 items-center text-sm hover:bg-muted/10 transition-colors"
                >
                  <div className="col-span-5 sm:col-span-6 space-y-0.5">
                    <p className="font-semibold text-foreground">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Unitário: {BRL(item.unit_price)} / {item.unit || 'un'}
                    </p>
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

                  <div className="col-span-2 flex items-center justify-center gap-1.5">
                    <Input
                      type="number"
                      min="1"
                      className="h-8 w-16 text-center text-xs px-1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateQuantity(
                          item.id,
                          Math.max(1, Number(e.target.value) || 1),
                          item.unit_price,
                        )
                      }
                    />
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {item.unit || 'un'}
                    </span>
                  </div>

                  <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-3 text-right">
                    <div>
                      <p className="font-bold text-foreground">{BRL(item.total_price)}</p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRemoveQuoteItem(item.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Barra de Totais */}
              <div className="p-4 bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {quoteItems.length} item(ns) incluído(s) no orçamento
                </span>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-muted-foreground">
                    TOTAL DO ORÇAMENTO:
                  </span>
                  <span className="text-2xl font-bold text-primary">{BRL(totalQuoteAmount)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Box de Condições & Observações do Orçamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" /> Condições Comerciais & Observações (Impresso
            no PDF)
          </CardTitle>
          <CardDescription>
            Defina prazo de entrega, forma de pagamento, garantias ou observações técnicas que serão
            impressas no rodapé do orçamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={3}
            placeholder="Ex: Pagamento 50% na aprovação e 50% na conclusão da instalação. Prazo de entrega de 15 dias úteis..."
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
          />

          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={savingNotes}
              onClick={handleSaveNotes}
              className="text-xs"
            >
              {savingNotes ? 'Salvando...' : 'Salvar Observações'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DIÁLOGO: ADICIONAR ITEM AO ORÇAMENTO */}
      <Dialog open={addItemModalOpen} onOpenChange={setAddItemModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Item ao Orçamento</DialogTitle>
            <DialogDescription>
              Selecione um item pré-cadastrado no catálogo ou adicione um item avulso personalizado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Origem do Item</Label>
              <Select value={selectedCatalogId} onValueChange={handleSelectCatalogItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha do catálogo ou item avulso..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">✏️ Item Avulso Personalizado</SelectItem>
                  {catalog.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {BRL(c.price)} ({c.item_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nome do Item *</Label>
              <Input
                placeholder="Ex: Padrão de Entrada Bifásico 100A, Instalação de DPS..."
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tipo de Item</Label>
                <Select
                  value={itemForm.item_type}
                  onValueChange={(val: any) => setItemForm({ ...itemForm, item_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produto">Produto / Equipamento</SelectItem>
                    <SelectItem value="servico">Serviço / Mão de obra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Unidade</Label>
                <Input
                  placeholder="un, m, serviço, hora"
                  value={itemForm.unit}
                  onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quantidade *</Label>
                <Input
                  type="number"
                  min="1"
                  value={itemForm.quantity}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      quantity: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor Unitário (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemForm.unit_price || ''}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      unit_price: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição Adicional (Opcional)</Label>
              <Input
                placeholder="Ex: Marca, modelo, especificações técnicas..."
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border flex justify-between items-center text-sm">
              <span className="font-semibold text-muted-foreground">Total Calculado:</span>
              <span className="text-lg font-bold text-primary">
                {BRL(itemForm.unit_price * itemForm.quantity)}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddQuoteItem} disabled={loading}>
              {loading ? 'Adicionando...' : 'Incluir no Orçamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: GERENCIAR CATÁLOGO DE PRODUTOS & SERVIÇOS DA COMPANHIA */}
      <Dialog open={catalogModalOpen} onOpenChange={setCatalogModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Package className="w-5 h-5" />
              <DialogTitle>Catálogo de Produtos & Serviços da Empresa</DialogTitle>
            </div>
            <DialogDescription>
              Cadastre itens padrão que podem ser reutilizados em qualquer orçamento da companhia.
            </DialogDescription>
          </DialogHeader>

          {/* Form para novo item no catálogo */}
          <div className="space-y-3 p-4 rounded-xl border bg-muted/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cadastrar Novo Item no Catálogo
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome *</Label>
                <Input
                  placeholder="Ex: Padrão Monofásico, Manutenção Preventiva..."
                  value={catalogItemForm.name}
                  onChange={(e) => setCatalogItemForm({ ...catalogItemForm, name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo</Label>
                <Select
                  value={catalogItemForm.item_type}
                  onValueChange={(val: any) =>
                    setCatalogItemForm({ ...catalogItemForm, item_type: val })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="produto">Produto</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Preço (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={catalogItemForm.price || ''}
                  onChange={(e) =>
                    setCatalogItemForm({
                      ...catalogItemForm,
                      price: Number(e.target.value) || 0,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Unidade</Label>
                <Input
                  placeholder="un, m, serviço"
                  value={catalogItemForm.unit}
                  onChange={(e) => setCatalogItemForm({ ...catalogItemForm, unit: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Descrição Curta</Label>
                <Input
                  placeholder="Detalhes..."
                  value={catalogItemForm.description}
                  onChange={(e) =>
                    setCatalogItemForm({ ...catalogItemForm, description: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                onClick={handleCreateCatalogItem}
                disabled={savingCatalogItem}
                className="text-xs gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Salvar no Catálogo
              </Button>
            </div>
          </div>

          {/* Lista de itens existentes no catálogo */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Itens Cadastrados ({catalog.length})
            </h4>

            {catalog.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-3 text-center">
                Nenhum item cadastrado no catálogo geral.
              </p>
            ) : (
              <div className="divide-y border rounded-lg max-h-60 overflow-y-auto text-xs">
                {catalog.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-2.5 flex items-center justify-between hover:bg-muted/30"
                  >
                    <div>
                      <span className="font-semibold text-foreground">{cat.name}</span>
                      <span className="text-muted-foreground ml-2">({cat.item_type})</span>
                      {cat.description && (
                        <p className="text-[11px] text-muted-foreground">{cat.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">
                        {BRL(cat.price)} / {cat.unit || 'un'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={async () => {
                          if (!confirm(`Remover "${cat.name}" do catálogo?`)) return
                          try {
                            await pb.collection('catalog_items').delete(cat.id)
                            setCatalog((prev) => prev.filter((i) => i.id !== cat.id))
                            toast({ title: 'Item removido do catálogo' })
                          } catch (e: any) {
                            toast({
                              variant: 'destructive',
                              title: 'Erro ao remover',
                              description: e.message,
                            })
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCatalogModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default BudgetsTab
