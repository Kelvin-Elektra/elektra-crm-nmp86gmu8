import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogFooter,
} from '@/components/ui/dialog'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Plus, FileDown, ShoppingBag, Loader2, Package } from 'lucide-react'
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
    neg.quote_notes !== undefined && neg.quote_notes !== null && neg.quote_notes !== ''
      ? neg.quote_notes
      : 'Pagamento e entrega: a combinar',
  )
  const [savingNotes, setSavingNotes] = useState(false)

  // Modal para adicionar item do catálogo ao orçamento
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

  const companyId = user?.company_id

  // Carrega itens da negociação e do catálogo (somente ativos)
  const loadData = async () => {
    if (!neg.id) return
    try {
      const [items, cat] = await Promise.all([
        getNegotiationQuoteItems(neg.id),
        companyId ? getCatalogItems(companyId) : Promise.resolve([]),
      ])
      setQuoteItems(items)
      setCatalog(cat.filter((c) => c.active !== false))
    } catch (e: any) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
  }, [neg.id, companyId])

  // Ao selecionar um item do catálogo
  const handleSelectCatalogItem = (catalogId: string) => {
    setSelectedCatalogId(catalogId)
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

  // Adicionar item ao orçamento da negociação (não altera o catálogo global)
  const handleAddQuoteItem = async () => {
    if (!itemForm.name.trim() || itemForm.unit_price < 0 || itemForm.quantity <= 0) {
      toast({
        variant: 'destructive',
        title: 'Campos incompletos',
        description: 'Selecione um item do catálogo com quantidade válida.',
      })
      return
    }

    setLoading(true)
    try {
      const totalPrice = itemForm.unit_price * itemForm.quantity
      await pb.collection('negotiation_quote_items').create({
        company_id: companyId,
        negotiation_id: neg.id,
        catalog_item_id: selectedCatalogId || null,
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

  // Atualizar preço unitário da linha (permitido no orçamento da negociação sem mudar catálogo)
  const handleUpdateUnitPrice = async (id: string, newPrice: number, quantity: number) => {
    if (newPrice < 0) return
    try {
      const totalPrice = quantity * newPrice
      await pb.collection('negotiation_quote_items').update(id, {
        unit_price: newPrice,
        total_price: totalPrice,
      })
      setQuoteItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, unit_price: newPrice, total_price: totalPrice } : i,
        ),
      )
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar valor',
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
      toast({ title: 'Observações salvas' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message })
    } finally {
      setSavingNotes(false)
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

      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Orcamento_${(neg.title || 'Elektra').replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'PDF gerado',
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
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <CardTitle className="text-xl">Orçamento Comercial</CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  if (catalog.length > 0) {
                    handleSelectCatalogItem(catalog[0].id)
                  } else {
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
                  }
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
                Gerar PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Tabela de Itens */}
        <CardContent className="p-0">
          {quoteItems.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground border-t">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              Nenhum item adicionado a este orçamento.
            </div>
          ) : (
            <div className="divide-y border-t">
              {/* Tabela responsiva com overflow horizontal suave se tela for muito estreita */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b text-xs font-semibold text-muted-foreground">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold">Item</th>
                      <th className="text-center py-3 px-3 font-semibold w-24">Tipo</th>
                      <th className="text-center py-3 px-3 font-semibold w-28">Qtd.</th>
                      <th className="text-right py-3 px-4 font-semibold w-36">Unitário</th>
                      <th className="text-right py-3 px-4 font-semibold w-36">Total</th>
                      <th className="w-12 py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {quoteItems.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 align-middle">
                          <div className="space-y-0.5">
                            <p className="font-semibold text-foreground">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center align-middle">
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
                        </td>

                        <td className="py-3 px-3 align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <Input
                              type="number"
                              min="1"
                              className="h-8 w-16 text-center text-xs px-1 bg-background"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(
                                  item.id,
                                  Math.max(1, Number(e.target.value) || 1),
                                  item.unit_price,
                                )
                              }
                            />
                            <span className="text-xs text-muted-foreground">
                              {item.unit || 'un'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right align-middle">
                          <div className="flex items-center justify-end">
                            <div className="relative flex items-center">
                              <span className="absolute left-2 text-[11px] text-muted-foreground pointer-events-none select-none">
                                R$
                              </span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                className="h-8 w-28 pl-7 text-right text-xs bg-background"
                                value={item.unit_price}
                                onChange={(e) =>
                                  handleUpdateUnitPrice(
                                    item.id,
                                    Math.max(0, Number(e.target.value) || 0),
                                    item.quantity,
                                  )
                                }
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right align-middle">
                          <span className="font-bold text-foreground text-sm whitespace-nowrap">
                            {BRL(item.total_price)}
                          </span>
                        </td>

                        <td className="py-3 px-2 text-center align-middle">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => handleRemoveQuoteItem(item.id)}
                            title="Remover item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Barra de Totais */}
              <div className="p-4 bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {quoteItems.length} item(ns) no orçamento
                </span>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-muted-foreground">TOTAL:</span>
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
          <CardTitle className="text-base">Condições Comerciais & Observações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={3}
            placeholder="Ex: Pagamento e entrega: a combinar"
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
              {savingNotes ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* DIÁLOGO: ADICIONAR ITEM DO CATÁLOGO AO ORÇAMENTO */}
      <Dialog open={addItemModalOpen} onOpenChange={setAddItemModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Item ao Orçamento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Item do Catálogo *</Label>
              {catalog.length === 0 ? (
                <div className="p-3 rounded-lg border border-dashed text-xs text-muted-foreground text-center">
                  Nenhum item cadastrado no catálogo. Um administrador da companhia pode cadastrar
                  em <strong>Produtos & Serviços</strong> no menu lateral.
                </div>
              ) : (
                <Select value={selectedCatalogId} onValueChange={handleSelectCatalogItem}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione um item do catálogo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {catalog.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {BRL(c.price)} ({c.item_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedCatalogId && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Tipo</Label>
                    <div className="h-9 px-3 flex items-center rounded-md bg-muted/40 border text-xs capitalize text-muted-foreground">
                      {itemForm.item_type}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Unidade</Label>
                    <div className="h-9 px-3 flex items-center rounded-md bg-muted/40 border text-xs text-muted-foreground">
                      {itemForm.unit || 'un'}
                    </div>
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
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Preço Unitário (R$) *</Label>
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
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border flex justify-between items-center text-sm">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Total da Linha:
                  </span>
                  <span className="text-base font-bold text-primary">
                    {BRL(itemForm.unit_price * itemForm.quantity)}
                  </span>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddItemModalOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAddQuoteItem} disabled={loading || !selectedCatalogId}>
              {loading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default BudgetsTab
