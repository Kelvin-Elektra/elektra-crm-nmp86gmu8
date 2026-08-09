import { useEffect, useState, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { ConfigurableFieldsForm } from '@/components/ConfigurableFieldsForm'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors, type FieldErrors } from '@/lib/pocketbase/errors'
import { getTemplates, previewTemplateUrl, type GeneratorTemplate } from '@/services/templates'
import {
  Save,
  FileImage,
  BarChart,
  Layers,
  GripVertical,
  Trash2,
  Plus,
  Settings2,
  Percent,
  Wand2,
  Building2,
  Eye,
  RefreshCw,
  AlertCircle,
  Loader2,
} from 'lucide-react'

const ELEMENTS = [
  { id: 'cover', label: 'Capa' },
  { id: 'summary', label: 'Resumo & Consumo' },
  { id: 'components', label: 'Componentes do Sistema' },
  { id: 'financial', label: 'Análise Financeira' },
  { id: 'execution', label: 'Execução & Garantias' },
  { id: 'investment', label: 'Investimento & Termos' },
]

const DEFAULT_LAYOUT = [
  { id: 'p1', elements: ['cover'] },
  { id: 'p2', elements: ['summary'] },
  { id: 'p3', elements: ['components'] },
  { id: 'p4', elements: ['financial'] },
  { id: 'p5', elements: ['execution'] },
  { id: 'p6', elements: ['investment'] },
]

export default function ProposalSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState('')

  const [templates, setTemplates] = useState<GeneratorTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState<string | null>(null)

  const [selectedTemplate, setSelectedTemplate] = useState<GeneratorTemplate | null>(null)
  const [fixedData, setFixedData] = useState<Record<string, any>>({})
  const [configModalOpen, setConfigModalOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  const [indicators, setIndicators] = useState({ inflation: '5', interest: '1' })
  const [pagesLayout, setPagesLayout] = useState<{ id: string; elements: string[] }[]>([])
  const [simultaneityFactors, setSimultaneityFactors] = useState<Record<string, string>>({
    Residencial: '30',
    Industrial: '60',
    Comercial: '50',
    Rural: '40',
    Outros: '35',
  })
  const [livePreviewOpen, setLivePreviewOpen] = useState<number | null>(null)
  const [defaultLeadTimeDays, setDefaultLeadTimeDays] = useState<string>('')
  const [defaultLeadTimeText, setDefaultLeadTimeText] = useState<string>('')
  const [defaultPaymentMethods, setDefaultPaymentMethods] = useState<string[]>([])

  const isAdmin =
    user?.role === 'User_elektra' || user?.role_company === 'admin' || user?.role === 'User_owner'

  const fetchTemplates = useCallback(async () => {
    setTemplatesLoading(true)
    setTemplatesError(null)
    try {
      const data = await getTemplates()
      setTemplates(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setTemplatesError(err?.message || 'Falha ao carregar templates do gerador.')
    } finally {
      setTemplatesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  useEffect(() => {
    if (!user?.company_id) return
    pb.collection('proposal_settings')
      .getFirstListItem(`company_id = '${user.company_id}'`)
      .then((record) => {
        setSettingsId(record.id)
        if (record.active_template_id || record.template)
          setActiveTemplate(record.active_template_id || record.template)
        if (record.indicators) setIndicators(record.indicators as any)
        if (record.branding) setFixedData(record.branding as any)
        if (record.pricing?.simultaneity_factors) {
          const f = record.pricing.simultaneity_factors
          setSimultaneityFactors({
            Residencial: String(f.Residencial ?? '30'),
            Industrial: String(f.Industrial ?? '60'),
            Comercial: String(f.Comercial ?? '50'),
            Rural: String(f.Rural ?? '40'),
            Outros: String(f.Outros ?? '35'),
          })
        }
        if (record.default_lead_time_days != null)
          setDefaultLeadTimeDays(String(record.default_lead_time_days))
        if (record.default_lead_time_text) setDefaultLeadTimeText(record.default_lead_time_text)
        if (Array.isArray(record.default_payment_methods))
          setDefaultPaymentMethods(record.default_payment_methods)
        if (
          record.pages_layout &&
          Array.isArray(record.pages_layout) &&
          record.pages_layout.length > 0
        )
          setPagesLayout(record.pages_layout)
        else setPagesLayout(DEFAULT_LAYOUT)
      })
      .catch(() => setPagesLayout(DEFAULT_LAYOUT))
  }, [user])

  if (!isAdmin && user) return <Navigate to="/dashboard" replace />

  const getDefaultForType = (type: string) => {
    switch (type) {
      case 'color':
        return '#000000'
      case 'number':
        return 0
      case 'boolean':
        return false
      default:
        return ''
    }
  }

  const handleSelectTemplate = (tpl: GeneratorTemplate) => {
    setActiveTemplate(tpl.id)
    setSelectedTemplate(tpl)
    const initial: Record<string, any> = {}
    for (const field of tpl.configurable_fields || []) {
      initial[field.key] = fixedData[field.key] ?? field.default ?? getDefaultForType(field.type)
    }
    setFixedData(initial)
    setConfigModalOpen(true)
  }

  const handleSave = async () => {
    if (!user?.company_id) return
    setLoading(true)
    setFieldErrors({})
    try {
      const data = {
        company_id: user.company_id,
        active_template_id: activeTemplate,
        indicators,
        branding: fixedData,
        pages_layout: pagesLayout,
        pricing: {
          simultaneity_factors: {
            Residencial: Number(simultaneityFactors.Residencial) || 30,
            Industrial: Number(simultaneityFactors.Industrial) || 60,
            Comercial: Number(simultaneityFactors.Comercial) || 50,
            Rural: Number(simultaneityFactors.Rural) || 40,
            Outros: Number(simultaneityFactors.Outros) || 35,
          },
        },
        default_lead_time_days: Number(defaultLeadTimeDays) || 0,
        default_lead_time_text: defaultLeadTimeText,
        default_payment_methods: defaultPaymentMethods.filter((m) => m.trim() !== ''),
      }
      if (settingsId) {
        await pb.collection('proposal_settings').update(settingsId, data)
      } else {
        const record = await pb.collection('proposal_settings').create(data)
        setSettingsId(record.id)
      }
      toast({ title: 'Sucesso', description: 'Configurações salvas.' })
      setConfigModalOpen(false)
    } catch (e) {
      const errors = extractFieldErrors(e)
      setFieldErrors(errors)
      const msg =
        Object.keys(errors).length > 0
          ? Object.values(errors).join(' ')
          : 'Não foi possível salvar.'
      toast({ variant: 'destructive', title: 'Erro', description: msg })
    } finally {
      setLoading(false)
    }
  }

  const handlePreview = async (tpl: GeneratorTemplate) => {
    setPreviewLoading(true)
    try {
      const res = await fetch(previewTemplateUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          template_id: tpl.id,
          fixed_data: fixedData,
          branding: fixedData,
        }),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData?.error || 'Falha ao gerar preview.')
      }
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('text/html')) {
        const html = await res.text()
        const blob = new Blob([html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        window.open(url, '_blank')
        setTimeout(() => URL.revokeObjectURL(url), 10000)
      } else {
        const data = await res.json()
        if (data.html) {
          const blob = new Blob([data.html], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          window.open(url, '_blank')
          setTimeout(() => URL.revokeObjectURL(url), 10000)
        } else if (data.url) {
          window.open(data.url, '_blank')
        } else {
          throw new Error('Resposta de preview inválida.')
        }
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: e.message || 'Falha ao gerar preview.',
      })
    } finally {
      setPreviewLoading(false)
    }
  }

  const onDragStartElement = (e: any, elId: string, fromPageIdx: number) => {
    e.dataTransfer.setData('elId', elId)
    e.dataTransfer.setData('fromPageIdx', fromPageIdx.toString())
  }

  const onDropElement = (e: any, toPageIdx: number) => {
    const elId = e.dataTransfer.getData('elId')
    const fromPageIdx = parseInt(e.dataTransfer.getData('fromPageIdx'))
    if (!elId) return
    setPagesLayout((prev) => {
      const next = [...prev]
      if (!isNaN(fromPageIdx) && fromPageIdx !== -1)
        next[fromPageIdx].elements = next[fromPageIdx].elements.filter((id) => id !== elId)
      if (!next[toPageIdx].elements.includes(elId)) next[toPageIdx].elements.push(elId)
      return next
    })
  }

  const handleRemoveElement = (pageIdx: number, elId: string) => {
    setPagesLayout((prev) => {
      const next = [...prev]
      next[pageIdx].elements = next[pageIdx].elements.filter((id) => id !== elId)
      return next
    })
  }

  const usedElements = new Set(pagesLayout.flatMap((p) => p.elements))
  const availableElements = ELEMENTS.filter((e) => !usedElements.has(e.id))

  return (
    <div className="flex flex-col gap-6 max-w-6xl animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Construtor de Propostas</h2>
          <p className="text-muted-foreground text-sm">
            Selecione o template e ajuste os indicadores comerciais.
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" /> Salvar Alterações
        </Button>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="flex flex-wrap w-full h-auto gap-2 p-1 bg-muted/50 rounded-xl justify-start">
          <TabsTrigger value="templates" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <FileImage className="mr-2 h-4 w-4" /> Templates e Design
          </TabsTrigger>
          <TabsTrigger value="indicadores" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <BarChart className="mr-2 h-4 w-4" /> Indicadores
          </TabsTrigger>
          <TabsTrigger value="simultaneidade" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <Percent className="mr-2 h-4 w-4" /> Simultaneidade
          </TabsTrigger>
          <TabsTrigger value="empresa" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <Building2 className="mr-2 h-4 w-4" /> Dados da Empresa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Templates Visuais</CardTitle>
                <CardDescription>Templates em produção do Gerador de Propostas</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchTemplates}
                disabled={templatesLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${templatesLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent>
              {templatesLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-3">
                      <Skeleton className="w-full aspect-[3/4] rounded-md" />
                      <Skeleton className="h-5 w-2/3 mx-auto" />
                      <Skeleton className="h-9 w-full" />
                    </div>
                  ))}
                </div>
              )}

              {templatesError && !templatesLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="text-sm text-muted-foreground text-center max-w-md">
                    {templatesError}
                  </p>
                  <Button variant="outline" size="sm" onClick={fetchTemplates}>
                    <RefreshCw className="h-4 w-4 mr-2" /> Tentar Novamente
                  </Button>
                </div>
              )}

              {!templatesLoading && !templatesError && templates.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                  <FileImage className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum template em produção disponível no Gerador.
                  </p>
                </div>
              )}

              {!templatesLoading && !templatesError && templates.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className={`border-2 rounded-xl p-3 transition-all flex flex-col ${
                        activeTemplate === tpl.id
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                    >
                      <div className="relative group">
                        {tpl.thumbnail ? (
                          <img
                            src={tpl.thumbnail}
                            alt={tpl.name}
                            className="w-full aspect-[3/4] object-cover rounded-md mb-3"
                          />
                        ) : (
                          <div className="w-full aspect-[3/4] rounded-md mb-3 bg-muted flex items-center justify-center">
                            <FileImage className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handlePreview(tpl)}
                            disabled={previewLoading}
                          >
                            {previewLoading ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4 mr-2" />
                            )}
                            Visualizar
                          </Button>
                        </div>
                      </div>
                      <div className="text-center font-semibold mb-3">{tpl.name}</div>
                      <Button
                        variant={activeTemplate === tpl.id ? 'default' : 'outline'}
                        className="mt-auto"
                        onClick={() => handleSelectTemplate(tpl)}
                      >
                        {activeTemplate === tpl.id ? (
                          <>
                            <Settings2 className="w-4 h-4 mr-2" /> Configurar
                          </>
                        ) : (
                          'Selecionar'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {activeTemplate === 'custom' && (
            <div className="flex gap-6 flex-col md:flex-row items-start animate-fade-in-up">
              <Card className="w-full md:w-1/3 sticky top-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Elementos Disponíveis</CardTitle>
                  <CardDescription>Arraste para as páginas ao lado</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {availableElements.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      Todos os elementos já foram utilizados.
                    </p>
                  )}
                  {availableElements.map((el) => (
                    <div
                      key={el.id}
                      draggable
                      onDragStart={(e) => onDragStartElement(e, el.id, -1)}
                      className="p-3 border rounded-md bg-white cursor-grab hover:border-primary shadow-sm flex items-center gap-2"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{el.label}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="w-full md:w-2/3 space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold">Composição de Páginas (Custom)</h3>
                </div>
                {pagesLayout.map((page, pIdx) => (
                  <Card
                    key={page.id}
                    className="bg-slate-50 border-dashed"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDropElement(e, pIdx)}
                  >
                    <CardHeader className="flex flex-row items-center justify-between pb-2 bg-slate-100 rounded-t-xl border-b">
                      <CardTitle className="text-base text-slate-600 flex items-center gap-4">
                        Página {pIdx + 1}
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary"
                          onClick={() => setLivePreviewOpen(pIdx)}
                        >
                          Live Preview
                        </Button>
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-8 w-8"
                        onClick={() => setPagesLayout(pagesLayout.filter((_, i) => i !== pIdx))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="p-4 min-h-[120px] flex flex-col gap-2">
                      {page.elements.length === 0 && (
                        <div className="flex-1 flex items-center justify-center border-2 border-dashed rounded-md text-muted-foreground text-sm opacity-50">
                          Arraste elementos para cá
                        </div>
                      )}
                      {page.elements.map((elId) => {
                        const el = ELEMENTS.find((e) => e.id === elId)
                        if (!el) return null
                        return (
                          <div
                            key={elId}
                            draggable
                            onDragStart={(e) => onDragStartElement(e, elId, pIdx)}
                            className="p-3 border rounded-md bg-white shadow-sm flex items-center justify-between cursor-grab hover:border-primary"
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">{el.label}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => handleRemoveElement(pIdx, elId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                ))}
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={() =>
                    setPagesLayout([...pagesLayout, { id: `p${Date.now()}`, elements: [] }])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Nova Página
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="indicadores" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Indicadores Econômicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Inflação Energética Anual (%)</Label>
                <Input
                  value={indicators.inflation}
                  onChange={(e) => setIndicators({ ...indicators, inflation: e.target.value })}
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de Juros de Oportunidade (%)</Label>
                <Input
                  value={indicators.interest}
                  onChange={(e) => setIndicators({ ...indicators, interest: e.target.value })}
                  type="number"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simultaneidade" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Fatores de Simultaneidade</CardTitle>
              <CardDescription>
                Defina os percentuais padrão de autoconsumo para cada categoria de consumidor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSimultaneityFactors({
                      Residencial: '30',
                      Industrial: '60',
                      Comercial: '50',
                      Rural: '40',
                      Outros: '35',
                    })
                  }
                >
                  <Wand2 className="w-4 h-4 mr-2" /> Preencher Sugestões
                </Button>
              </div>
              {[
                { key: 'Residencial', label: 'Residencial' },
                { key: 'Industrial', label: 'Industrial' },
                { key: 'Comercial', label: 'Comercial' },
                { key: 'Rural', label: 'Rural' },
                { key: 'Outros', label: 'Outros' },
              ].map((cat) => (
                <div key={cat.key} className="space-y-2">
                  <Label>{cat.label} (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={simultaneityFactors[cat.key]}
                    onChange={(e) =>
                      setSimultaneityFactors({
                        ...simultaneityFactors,
                        [cat.key]: e.target.value,
                      })
                    }
                  />
                </div>
              ))}
              <Button onClick={handleSave} disabled={loading} className="w-full">
                <Save className="mr-2 h-4 w-4" /> Salvar Fatores
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="empresa" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Padrões de Proposta</CardTitle>
              <CardDescription>
                Defina os valores padrão que serão utilizados ao gerar novas propostas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-lg">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-3">Prazo de Instalação Padrão</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Prazo (dias)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={defaultLeadTimeDays}
                        onChange={(e) => setDefaultLeadTimeDays(e.target.value)}
                        placeholder="30"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Descrição do prazo</Label>
                      <Input
                        value={defaultLeadTimeText}
                        onChange={(e) => setDefaultLeadTimeText(e.target.value)}
                        placeholder="Ex: após assinatura do contrato"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Formas de Pagamento Aceitas</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Estas formas aparecerão como sugestão padrão ao gerar propostas.
                  </p>
                </div>
                <div className="space-y-2">
                  {defaultPaymentMethods.length === 0 && (
                    <p className="text-sm text-muted-foreground italic py-2">
                      Nenhuma forma de pagamento cadastrada.
                    </p>
                  )}
                  {defaultPaymentMethods.map((method, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={method}
                        onChange={(e) => {
                          const updated = [...defaultPaymentMethods]
                          updated[idx] = e.target.value
                          setDefaultPaymentMethods(updated)
                        }}
                        placeholder={`Forma ${idx + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() =>
                          setDefaultPaymentMethods(
                            defaultPaymentMethods.filter((_, i) => i !== idx),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => setDefaultPaymentMethods([...defaultPaymentMethods, ''])}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Adicionar Forma de Pagamento
                  </Button>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Use o botão "Salvar Alterações" no topo da página para persistir estas
                  configurações.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configurar Template</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name
                ? `Ajuste os dados fixos do template "${selectedTemplate.name}".`
                : 'Ajuste os dados fixos do template selecionado.'}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <ConfigurableFieldsForm
              fields={selectedTemplate.configurable_fields || []}
              values={fixedData}
              onChange={(key, val) => setFixedData((prev) => ({ ...prev, [key]: val }))}
            />
          )}
          {Object.keys(fieldErrors).length > 0 && (
            <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                {Object.entries(fieldErrors).map(([field, msg]) => (
                  <p key={field}>{msg}</p>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handlePreview(selectedTemplate!)}
              disabled={previewLoading}
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Visualizar
            </Button>
            <Button variant="ghost" onClick={() => setConfigModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="mr-2 h-4 w-4" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={livePreviewOpen !== null} onOpenChange={() => setLivePreviewOpen(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Live Preview - Página {livePreviewOpen !== null ? livePreviewOpen + 1 : ''}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 bg-muted/20 border rounded-xl flex items-center justify-center p-8 overflow-y-auto">
            <div className="bg-white w-full max-w-3xl aspect-[1/1.4] shadow-lg rounded p-12 space-y-6">
              {livePreviewOpen !== null &&
                pagesLayout[livePreviewOpen]?.elements.map((elId) => (
                  <div
                    key={elId}
                    className="border-2 border-dashed border-primary/30 p-8 text-center rounded text-primary/60 font-semibold text-lg bg-primary/5"
                  >
                    Elemento Rendering Placeholder: {ELEMENTS.find((e) => e.id === elId)?.label}
                  </div>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
