import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Plus, X } from 'lucide-react'
import { UserDiscountConfigModal } from '@/components/UserDiscountConfigModal'

interface TemplateOption {
  id: string
  name: string
}

interface PagesLayout {
  id: string
  elements: string[]
}

// Templates fixos do Gerador
const FIXED_TEMPLATE_OPTIONS: TemplateOption[] = [
  { id: '5d7031e0a417b4c', name: 'Template 1 - Clássico' },
  { id: '5555666677778888', name: 'Template 2 - Moderno' },
  { id: '5d7031e0a417b4c-2', name: 'Template 3 - Minimalista' },
  { id: '5555666677778888-2', name: 'Template 4 - Premium' },
]

// Estilo da lista de equipamentos (Templates 2 e 4) — lido pelo hook do CRM
const EQUIPMENT_LIST_STYLE_OPTIONS: TemplateOption[] = [
  { id: 'compact', name: 'Lista compacta (apenas módulos e inversores)' },
  { id: 'full', name: 'Lista completa de equipamentos e insumos' },
  { id: 'generic', name: 'Item genérico (proteção e materiais)' },
  { id: 'none', name: 'Sem lista de equipamentos' },
]

// Chaves fixas de elementos de página
const FIXED_ELEMENT_OPTIONS: { id: string; label: string }[] = [
  { id: 'cover', label: 'Capa' },
  { id: 'summary', label: 'Resumo' },
  { id: 'components', label: 'Componentes' },
  { id: 'financial', label: 'Financeiro' },
  { id: 'execution', label: 'Execução' },
  { id: 'investment', label: 'Investimento' },
  { id: 'quote', label: 'Orçamento' },
  { id: 'signature', label: 'Assinatura' },
]

export default function ProposalSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()
  const companyId = user?.company_id || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string | null>(null)
  // Objeto pricing carregado do banco — base do MERGE (nunca substituir inteiro)
  const [loadedPricing, setLoadedPricing] = useState<Record<string, any>>({})

  const [activeTemplateId, setActiveTemplateId] = useState('')
  const [equipmentListStyle, setEquipmentListStyle] = useState('full')
  const [includeSupplies, setIncludeSupplies] = useState(true)
  const [pagesLayout, setPagesLayout] = useState<PagesLayout[]>([])
  const [visiblePages, setVisiblePages] = useState<string[]>([])
  const [defaultValidityDays, setDefaultValidityDays] = useState(30)
  const [defaultLeadTimeDays, setDefaultLeadTimeDays] = useState(30)
  const [defaultLeadTimeText, setDefaultLeadTimeText] = useState('após assinatura do contrato')
  const [defaultPaymentMethods, setDefaultPaymentMethods] = useState<string[]>([])
  const [newPaymentMethod, setNewPaymentMethod] = useState('')
  const [defaultTariffAdjustment, setDefaultTariffAdjustment] = useState(8)
  const [indicators, setIndicators] = useState<{ inflation: string; interest: string }>({
    inflation: '5',
    interest: '1',
  })
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general')

  // Config de desconto (nível companhia, guardada dentro de pricing)
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountType, setDiscountType] = useState('percent')
  const [discountValue, setDiscountValue] = useState(0)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [userDiscountModalOpen, setUserDiscountModalOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<any>(null)

  const isAdmin =
    user?.role === 'User_elektra' || user?.role_company === 'admin' || user?.role === 'User_owner'

  useEffect(() => {
    if (!companyId) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const rec = await pb
          .collection('proposal_settings')
          .getFirstListItem(`company_id="${companyId}"`)
          .catch(() => null)
        if (cancelled) return
        if (rec) {
          setSettingsId(rec.id)
          const pricing =
            typeof rec.pricing === 'string' ? safeParse(rec.pricing) : rec.pricing || {}
          setLoadedPricing(pricing)
          setActiveTemplateId(rec.active_template_id || '')
          setEquipmentListStyle(pricing.equipment_list_style || 'full')
          setIncludeSupplies(rec.include_supplies !== false)
          setVisiblePages(Array.isArray(rec.visible_pages) ? rec.visible_pages : [])
          const layout =
            typeof rec.pages_layout === 'string' ? safeParse(rec.pages_layout) : rec.pages_layout
          setPagesLayout(
            Array.isArray(layout) && layout.length > 0
              ? layout
              : [{ id: 'page-1', elements: FIXED_ELEMENT_OPTIONS.map((e) => e.id) }],
          )
          setDefaultValidityDays(Number(rec.default_validity_days ?? 30))
          setDefaultLeadTimeDays(Number(rec.default_lead_time_days ?? 30))
          setDefaultLeadTimeText(rec.default_lead_time_text || 'após assinatura do contrato')
          setDefaultPaymentMethods(
            Array.isArray(rec.default_payment_methods) ? rec.default_payment_methods : [],
          )
          setDefaultTariffAdjustment(Number(rec.default_tariff_adjustment ?? 8))
          const ind =
            typeof rec.indicators === 'string' ? safeParse(rec.indicators) : rec.indicators || {}
          setIndicators({
            inflation: String(ind.inflation ?? '5'),
            interest: String(ind.interest ?? '1'),
          })
          setDiscountEnabled(pricing.discount_enabled === true)
          setDiscountType(pricing.discount_type || 'percent')
          setDiscountValue(Number(pricing.discount_value ?? 0))
        }
      } catch (err: any) {
        if (!cancelled)
          toast({
            variant: 'destructive',
            title: 'Erro',
            description: err?.message || 'Falha ao carregar configurações',
          })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [companyId])

  // Equipe da companhia (para configuração de desconto por usuário)
  useEffect(() => {
    if (!companyId || !isAdmin) return
    let cancelled = false
    pb.collection('users')
      .getFullList({ filter: `company_id="${companyId}"`, sort: 'name' })
      .then((recs) => {
        if (!cancelled) setAllUsers(recs as any[])
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [companyId, isAdmin])

  const persist = async (data: Record<string, any>) => {
    if (settingsId) {
      await pb.collection('proposal_settings').update(settingsId, data)
    } else {
      const rec = await pb
        .collection('proposal_settings')
        .create({ company_id: companyId, ...data })
      setSettingsId(rec.id)
    }
  }

  // MERGE de pricing: preserva simultaneity_factors e demais chaves existentes
  const mergePricing = (updates: Record<string, any>) => {
    const next = { ...loadedPricing, ...updates }
    setLoadedPricing(next)
    return next
  }

  const handleSaveGeneral = async () => {
    setSaving(true)
    try {
      await persist({
        active_template_id: activeTemplateId,
        default_validity_days: Number(defaultValidityDays) || 0,
        default_lead_time_days: Number(defaultLeadTimeDays) || 0,
        default_lead_time_text: defaultLeadTimeText,
        default_payment_methods: defaultPaymentMethods,
        default_tariff_adjustment: Number(defaultTariffAdjustment) || 0,
      })
      toast({ title: 'Sucesso', description: 'Configurações gerais salvas.' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Falha ao salvar',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDesign = async () => {
    setSaving(true)
    try {
      const pricing = mergePricing({ equipment_list_style: equipmentListStyle })
      await persist({
        pricing,
        include_supplies: includeSupplies,
        visible_pages: visiblePages,
        pages_layout: pagesLayout,
      })
      toast({ title: 'Sucesso', description: 'Template e Design salvos.' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Falha ao salvar',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveIndicators = async () => {
    setSaving(true)
    try {
      await persist({ indicators })
      toast({ title: 'Sucesso', description: 'Indicadores salvos.' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Falha ao salvar',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveDiscounts = async () => {
    setSaving(true)
    try {
      const pricing = mergePricing({
        discount_enabled: discountEnabled,
        discount_type: discountType,
        discount_value: Number(discountValue) || 0,
      })
      await persist({ pricing })
      toast({ title: 'Sucesso', description: 'Configuração de desconto salva.' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err?.message || 'Falha ao salvar',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações da Proposta</h2>
        <p className="text-muted-foreground">
          Padrões usados na geração das propostas comerciais desta companhia.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="design">Template e Design</TabsTrigger>
          <TabsTrigger value="indicators">Indicadores</TabsTrigger>
          {isAdmin && <TabsTrigger value="discounts">Descontos</TabsTrigger>}
        </TabsList>

        {/* ABA GERAL */}
        <TabsContent value="general" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template Padrão</CardTitle>
              <CardDescription>Modelo usado por padrão na geração das propostas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-md">
                <Label>Template ativo</Label>
                <Select value={activeTemplateId} onValueChange={setActiveTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o template" />
                  </SelectTrigger>
                  <SelectContent>
                    {FIXED_TEMPLATE_OPTIONS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div className="space-y-2">
                  <Label>Validade padrão (dias)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={defaultValidityDays}
                    onChange={(e) => setDefaultValidityDays(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo de entrega padrão (dias)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={defaultLeadTimeDays}
                    onChange={(e) => setDefaultLeadTimeDays(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="space-y-2 max-w-md">
                <Label>Texto do prazo de entrega</Label>
                <Input
                  value={defaultLeadTimeText}
                  onChange={(e) => setDefaultLeadTimeText(e.target.value)}
                />
              </div>
              <div className="space-y-2 max-w-md">
                <Label>Reajuste tarifário anual padrão (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={defaultTariffAdjustment}
                  onChange={(e) => setDefaultTariffAdjustment(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2 max-w-md">
                <Label>Formas de pagamento padrão</Label>
                <div className="flex flex-wrap gap-2">
                  {defaultPaymentMethods.map((m) => (
                    <Badge key={m} variant="secondary" className="gap-1">
                      {m}
                      <button
                        type="button"
                        onClick={() =>
                          setDefaultPaymentMethods(defaultPaymentMethods.filter((x) => x !== m))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newPaymentMethod}
                    placeholder="Ex.: Pix, Cartão 12x"
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const v = newPaymentMethod.trim()
                      if (v && !defaultPaymentMethods.includes(v)) {
                        setDefaultPaymentMethods([...defaultPaymentMethods, v])
                      }
                      setNewPaymentMethod('')
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button onClick={handleSaveGeneral} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Geral
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA TEMPLATE E DESIGN */}
        <TabsContent value="design" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lista de Equipamentos (Templates 2 e 4)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-md">
                <Label>Estilo da lista</Label>
                <Select value={equipmentListStyle} onValueChange={setEquipmentListStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estilo" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_LIST_STYLE_OPTIONS.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={includeSupplies}
                  onCheckedChange={setIncludeSupplies}
                  id="include-supplies"
                />
                <Label htmlFor="include-supplies">Incluir insumos na proposta</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Páginas Visíveis</CardTitle>
              <CardDescription>Elementos exibidos na proposta gerada.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FIXED_ELEMENT_OPTIONS.map((el) => (
                  <label key={el.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={visiblePages.includes(el.id)}
                      onCheckedChange={(v) =>
                        setVisiblePages(
                          v ? [...visiblePages, el.id] : visiblePages.filter((x) => x !== el.id),
                        )
                      }
                    />
                    {el.label}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Layout de Páginas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pagesLayout.map((page, pIdx) => (
                <div key={page.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      className="max-w-xs"
                      value={page.id}
                      onChange={(e) => {
                        const next = [...pagesLayout]
                        next[pIdx] = { ...page, id: e.target.value }
                        setPagesLayout(next)
                      }}
                    />
                    {pagesLayout.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPagesLayout(pagesLayout.filter((_, i) => i !== pIdx))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {FIXED_ELEMENT_OPTIONS.map((el) => (
                      <label key={el.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={page.elements.includes(el.id)}
                          onCheckedChange={(v) => {
                            const next = [...pagesLayout]
                            next[pIdx] = {
                              ...page,
                              elements: v
                                ? [...page.elements, el.id]
                                : page.elements.filter((x) => x !== el.id),
                            }
                            setPagesLayout(next)
                          }}
                        />
                        {el.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() =>
                  setPagesLayout([
                    ...pagesLayout,
                    { id: `page-${pagesLayout.length + 1}`, elements: [] },
                  ])
                }
              >
                <Plus className="h-4 w-4 mr-2" /> Nova página
              </Button>
            </CardContent>
          </Card>

          <Button onClick={handleSaveDesign} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Template e Design
          </Button>
        </TabsContent>

        {/* ABA INDICADORES */}
        <TabsContent value="indicators" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Indicadores Financeiros</CardTitle>
              <CardDescription>Usados na projeção da análise financeira.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                <div className="space-y-2">
                  <Label>Inflação anual (%)</Label>
                  <Input
                    value={indicators.inflation}
                    onChange={(e) => setIndicators({ ...indicators, inflation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taxa de juros anual (%)</Label>
                  <Input
                    value={indicators.interest}
                    onChange={(e) => setIndicators({ ...indicators, interest: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={handleSaveIndicators} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Indicadores
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA DESCONTOS */}
        {isAdmin && (
          <TabsContent value="discounts" className="mt-4 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Desconto Padrão da Companhia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={discountEnabled}
                    onCheckedChange={setDiscountEnabled}
                    id="discount-enabled"
                  />
                  <Label htmlFor="discount-enabled">Permitir desconto nas propostas</Label>
                </div>
                {discountEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={discountType} onValueChange={setDiscountType}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">Percentual (%)</SelectItem>
                          <SelectItem value="value">Valor (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{discountType === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}</Label>
                      <Input
                        type="number"
                        min={0}
                        value={discountValue}
                        onChange={(e) => setDiscountValue(Number(e.target.value))}
                      />
                    </div>
                  </div>
                )}
                <Button onClick={handleSaveDiscounts} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Descontos
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Desconto Máximo por Usuário</CardTitle>
                <CardDescription>Limite comercial de cada membro da equipe.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {allUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
                )}
                {allUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between border-b py-2">
                    <div>
                      <p className="text-sm font-medium">{u.name || u.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Desconto máximo: {Number(u.max_discount ?? 0)}%
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMember(u)
                        setUserDiscountModalOpen(true)
                      }}
                    >
                      Configurar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <UserDiscountConfigModal
        open={userDiscountModalOpen}
        onOpenChange={setUserDiscountModalOpen}
        member={selectedMember}
      />
    </div>
  )
}

function safeParse(v: string): Record<string, any> {
  try {
    return JSON.parse(v)
  } catch (_) {
    return {}
  }
}
