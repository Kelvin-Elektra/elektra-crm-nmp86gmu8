import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Save,
  FileImage,
  BarChart,
  Layers,
  GripVertical,
  Trash2,
  Plus,
  Eye,
  Settings2,
  Percent,
  Wand2,
  Building2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ProposalViewer } from '@/components/ProposalViewer'

const ELEMENTS = [
  { id: 'cover', label: 'Capa' },
  { id: 'summary', label: 'Resumo & Consumo' },
  { id: 'components', label: 'Componentes do Sistema' },
  { id: 'financial', label: 'Análise Financeira' },
  { id: 'execution', label: 'Execução & Garantias' },
  { id: 'investment', label: 'Investimento & Termos' },
]

export default function ProposalSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState('modern')

  const [indicators, setIndicators] = useState({ inflation: '5', interest: '1' })
  const [branding, setBranding] = useState({
    primaryColor: '#2563eb',
    secondaryColor: '#1e40af',
    gradientColor: '#3b82f6',
  })
  const [pagesLayout, setPagesLayout] = useState<{ id: string; elements: string[] }[]>([])

  const [previewOpen, setPreviewOpen] = useState<string | null>(null)
  const [simultaneityFactors, setSimultaneityFactors] = useState<Record<string, string>>({
    Residencial: '30',
    Industrial: '60',
    Comercial: '50',
    Rural: '40',
    Outros: '35',
  })

  const defaultPreviewLayout = [
    { id: 'p1', elements: ['cover'] },
    { id: 'p2', elements: ['summary'] },
    { id: 'p3', elements: ['components'] },
    { id: 'p4', elements: ['financial'] },
    { id: 'p5', elements: ['execution'] },
    { id: 'p6', elements: ['investment'] },
  ]

  const dummyNegotiation = {
    company_id: user?.company_id,
    avg_consumption: 550,
    address: 'Rua das Palmeiras, 123 - Centro',
    city: 'São Paulo',
    state: 'SP',
    cep: '01000-000',
    concessionaire: 'Enel Distribuição São Paulo',
    uc: '123456789',
    consumer_category: 'Residencial',
    expand: {
      lead_id: {
        name: 'João Silva Santos',
        document: '123.456.789-00',
        email: 'joao.silva@email.com',
        phone: '(11) 98765-4321',
      },
    },
    sizing: {
      kit_power_kwp: 7.2,
      module_qty: 14,
      installation_type: 'Telhado Cerâmico',
      inverters: [],
    },
  }

  const dummyProposal = {
    id: 'TPL-PREVIEW',
    created: new Date().toISOString(),
    total_value: 38500,
    validity_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    payment_terms: '50% na assinatura, 50% na instalação.',
    snapshot_data: {
      template: previewOpen || activeTemplate,
      branding,
      pages_layout: pagesLayout.length > 0 ? pagesLayout : defaultPreviewLayout,
      sizing: dummyNegotiation.sizing,
      rawModule: { brand: 'Canadian Solar', name: 'CS655-550W', power: 550 },
      rawInverters: [
        { brand: 'Hoymiles', name: 'HMT-2250-6T', power: 7.5, qty: 1, warranty: '10 anos' },
      ],
      financialProjection: {
        currentMonthlyCost: 495,
        futureMonthlyBill: 49.5,
        monthlySavings: 445.5,
        annualSavings: 5346,
        roiMonths: 73,
        roiYears: 6,
        roiRemainingMonths: 1,
        estMonthlyGen: 850,
        baseRate: 0.9,
        instantConsumption: 165,
        compensatedConsumption: 385,
        teComponent: 0.35,
        tusdComponent: 0.55,
        fioBCost: 38.5,
        energyFromGrid: 0,
        consumerCategory: 'Residencial',
        simultaneityFactor: 30,
        tariffDetails: {
          found: true,
          tusd: 0.55,
          te: 0.35,
          icms_exemption: 'both',
          fio_b_value: 0.22,
        },
      },
    },
  }
  const [brandingModalOpen, setBrandingModalOpen] = useState(false)
  const [livePreviewOpen, setLivePreviewOpen] = useState<number | null>(null)
  const [defaultLeadTimeDays, setDefaultLeadTimeDays] = useState<string>('')
  const [defaultLeadTimeText, setDefaultLeadTimeText] = useState<string>('')
  const [defaultPaymentMethods, setDefaultPaymentMethods] = useState<string[]>([])

  const isAdmin =
    user?.role === 'User_elektra' || user?.role_company === 'admin' || user?.role === 'User_owner'

  useEffect(() => {
    if (!user?.company_id) return
    pb.collection('proposal_settings')
      .getFirstListItem(`company_id = '${user.company_id}'`)
      .then((record) => {
        setSettingsId(record.id)
        if (record.active_template_id || record.template)
          setActiveTemplate(record.active_template_id || record.template)
        if (record.indicators) setIndicators(record.indicators as any)
        if (record.branding) setBranding(record.branding as any)
        if (record.pricing?.simultaneity_factors) {
          const factors = record.pricing.simultaneity_factors
          setSimultaneityFactors({
            Residencial: String(factors.Residencial ?? '30'),
            Industrial: String(factors.Industrial ?? '60'),
            Comercial: String(factors.Comercial ?? '50'),
            Rural: String(factors.Rural ?? '40'),
            Outros: String(factors.Outros ?? '35'),
          })
        }

        if (record.default_lead_time_days != null) {
          setDefaultLeadTimeDays(String(record.default_lead_time_days))
        }
        if (record.default_lead_time_text) {
          setDefaultLeadTimeText(record.default_lead_time_text)
        }
        if (Array.isArray(record.default_payment_methods)) {
          setDefaultPaymentMethods(record.default_payment_methods)
        }

        if (
          record.pages_layout &&
          Array.isArray(record.pages_layout) &&
          record.pages_layout.length > 0
        ) {
          setPagesLayout(record.pages_layout)
        } else {
          setPagesLayout([
            { id: 'p1', elements: ['cover'] },
            { id: 'p2', elements: ['summary'] },
            { id: 'p3', elements: ['components'] },
            { id: 'p4', elements: ['financial'] },
            { id: 'p5', elements: ['execution'] },
            { id: 'p6', elements: ['investment'] },
          ])
        }
      })
      .catch(() => {
        setPagesLayout([
          { id: 'p1', elements: ['cover'] },
          { id: 'p2', elements: ['summary'] },
          { id: 'p3', elements: ['components'] },
          { id: 'p4', elements: ['financial'] },
          { id: 'p5', elements: ['execution'] },
          { id: 'p6', elements: ['investment'] },
        ])
      })
  }, [user])

  if (!isAdmin && user) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSave = async () => {
    if (!user?.company_id) return
    setLoading(true)
    try {
      const pricing = {
        simultaneity_factors: {
          Residencial: Number(simultaneityFactors.Residencial) || 30,
          Industrial: Number(simultaneityFactors.Industrial) || 60,
          Comercial: Number(simultaneityFactors.Comercial) || 50,
          Rural: Number(simultaneityFactors.Rural) || 40,
          Outros: Number(simultaneityFactors.Outros) || 35,
        },
      }
      const data = {
        company_id: user.company_id,
        active_template_id: activeTemplate,
        indicators,
        branding,
        pages_layout: pagesLayout,
        pricing,
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
      setBrandingModalOpen(false)
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar.' })
    } finally {
      setLoading(false)
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
      const newLayout = [...prev]
      if (!isNaN(fromPageIdx) && fromPageIdx !== -1) {
        newLayout[fromPageIdx].elements = newLayout[fromPageIdx].elements.filter(
          (id) => id !== elId,
        )
      }
      if (!newLayout[toPageIdx].elements.includes(elId)) {
        newLayout[toPageIdx].elements.push(elId)
      }
      return newLayout
    })
  }

  const handleRemoveElement = (pageIdx: number, elId: string) => {
    setPagesLayout((prev) => {
      const newLayout = [...prev]
      newLayout[pageIdx].elements = newLayout[pageIdx].elements.filter((id) => id !== elId)
      return newLayout
    })
  }

  const selectTemplate = (tplId: string) => {
    setActiveTemplate(tplId)
    setBrandingModalOpen(true)
  }

  const usedElements = new Set(pagesLayout.flatMap((p) => p.elements))
  const availableElements = ELEMENTS.filter((e) => !usedElements.has(e.id))

  const templates = [
    {
      id: 'modern',
      name: 'Modern (Capa Clara)',
      img: 'https://img.usecurling.com/p/300/400?q=modern%20solar%20panel&color=green',
    },
    {
      id: 'elegant',
      name: 'Elegant (Capa Escura)',
      img: 'https://img.usecurling.com/p/300/400?q=dark%20gradient&color=blue',
    },
    {
      id: 'compact',
      name: 'Compact',
      img: 'https://img.usecurling.com/p/300/400?q=minimalist%20report&color=white',
    },
    {
      id: 'corporate',
      name: 'Corporate',
      img: 'https://img.usecurling.com/p/300/400?q=business%20presentation&color=blue',
    },
    {
      id: 'technical',
      name: 'Technical',
      img: 'https://img.usecurling.com/p/300/400?q=blueprint%20data&color=cyan',
    },
    {
      id: 'custom',
      name: 'Custom',
      img: 'https://img.usecurling.com/p/300/400?q=blank%20canvas&color=purple',
    },
  ]

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
            <CardHeader>
              <CardTitle>Templates Visuais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className={`border-2 rounded-xl p-3 transition-all flex flex-col ${activeTemplate === tpl.id ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
                >
                  <div className="relative group">
                    <img
                      src={tpl.img}
                      alt={tpl.name}
                      className="w-full aspect-[3/4] object-cover rounded-md mb-3"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(tpl.id)}>
                        <Eye className="h-4 w-4 mr-2" /> Preview
                      </Button>
                    </div>
                  </div>
                  <div className="text-center font-semibold mb-3">{tpl.name}</div>
                  <Button
                    variant={activeTemplate === tpl.id ? 'default' : 'outline'}
                    className="mt-auto"
                    onClick={() => selectTemplate(tpl.id)}
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
                Defina os percentuais padrão de autoconsumo para cada categoria de consumidor. Estes
                valores serão aplicados automaticamente ao selecionar a categoria na negociação.
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
                Defina os valores padrão que serão utilizados ao gerar novas propostas comerciais.
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
                        onClick={() => {
                          setDefaultPaymentMethods(
                            defaultPaymentMethods.filter((_, i) => i !== idx),
                          )
                        }}
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

      {/* Modals */}
      {previewOpen && (
        <ProposalViewer
          open={!!previewOpen}
          onOpenChange={(v: boolean) => !v && setPreviewOpen(null)}
          proposal={dummyProposal}
          negotiation={dummyNegotiation}
        />
      )}

      <Dialog open={brandingModalOpen} onOpenChange={setBrandingModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Personalizar Template</DialogTitle>
            <DialogDescription>
              Ajuste as cores da marca para que se apliquem ao template selecionado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between">
              <Label>Cor Primária</Label>
              <Input
                type="color"
                value={branding.primaryColor}
                onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                className="w-16 h-10 p-1 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Cor Secundária</Label>
              <Input
                type="color"
                value={branding.secondaryColor}
                onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                className="w-16 h-10 p-1 cursor-pointer"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Cor de Gradiente</Label>
              <Input
                type="color"
                value={branding.gradientColor}
                onChange={(e) => setBranding({ ...branding, gradientColor: e.target.value })}
                className="w-16 h-10 p-1 cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandingModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Preferências</Button>
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
