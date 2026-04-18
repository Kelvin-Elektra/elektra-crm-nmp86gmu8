import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Save, FileImage, BarChart, Zap, Palette, Layers } from 'lucide-react'

export default function ProposalSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTemplate, setActiveTemplate] = useState('modern')

  const [formData, setFormData] = useState({
    indicators: { inflation: '5', interest: '1' },
    tariffs: { tusd: '0.65', te: '0.45' },
    pricing: { margin: '30', tax: '12' },
    visible_pages: {
      cover: true,
      facade: true,
      technical: true,
      charts: true,
      system: true,
      financial: true,
      warranty: true,
      schedule: true,
      terms: true,
    },
    branding: {
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      gradientColor: '#3b82f6',
    },
  })

  useEffect(() => {
    if (!user?.company_id) return
    pb.collection('proposal_settings')
      .getFirstListItem(`company_id = '${user.company_id}'`)
      .then((record) => {
        setSettingsId(record.id)
        if (record.template) setActiveTemplate(record.template)
        setFormData({
          indicators: record.indicators || formData.indicators,
          tariffs: record.tariffs || formData.tariffs,
          pricing: record.pricing || formData.pricing,
          visible_pages: record.visible_pages || formData.visible_pages,
          branding: record.branding || formData.branding,
        })
      })
      .catch((e) => {
        console.error(e)
      })
  }, [user])

  const handleSave = async () => {
    if (!user?.company_id) return
    setLoading(true)
    try {
      const data = {
        company_id: user.company_id,
        template: activeTemplate,
        indicators: formData.indicators,
        tariffs: formData.tariffs,
        pricing: formData.pricing,
        visible_pages: formData.visible_pages,
        branding: formData.branding,
      }
      if (settingsId) {
        await pb.collection('proposal_settings').update(settingsId, data)
      } else {
        const record = await pb.collection('proposal_settings').create(data)
        setSettingsId(record.id)
      }
      toast({ title: 'Sucesso', description: 'Configurações salvas com sucesso.' })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar.' })
    } finally {
      setLoading(false)
    }
  }

  const handleNestedChange = (category: keyof typeof formData, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [category]: { ...(prev[category as keyof typeof formData] as any), [field]: value },
    }))
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações da Proposta</h2>
          <p className="text-muted-foreground text-sm">
            Gerencie os padrões, cores e páginas para geração de propostas.
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" /> Salvar
        </Button>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="flex flex-wrap w-full h-auto gap-2 p-1 bg-muted/50 rounded-xl justify-start">
          <TabsTrigger value="templates" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <FileImage className="mr-2 h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="branding" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <Palette className="mr-2 h-4 w-4" /> Branding
          </TabsTrigger>
          <TabsTrigger value="pages" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <Layers className="mr-2 h-4 w-4" /> Páginas
          </TabsTrigger>
          <TabsTrigger value="indicadores" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <BarChart className="mr-2 h-4 w-4" /> Indicadores
          </TabsTrigger>
          <TabsTrigger value="tarifas" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <Zap className="mr-2 h-4 w-4" /> Tarifas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Templates Profissionais</CardTitle>
              <CardDescription>Selecione o layout padrão das propostas.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  id: 'modern',
                  name: 'Modern Solar',
                  desc: 'Foco em gráficos e ROI',
                  img: 'https://img.usecurling.com/p/400/500?q=modern%20document%20solar%20energy&color=blue',
                },
                {
                  id: 'technical',
                  name: 'Technical Detail',
                  desc: 'Layout técnico',
                  img: 'https://img.usecurling.com/p/400/500?q=technical%20blueprint%20document&color=gray',
                },
                {
                  id: 'compact',
                  name: 'Compact Quote',
                  desc: 'Proposta direta',
                  img: 'https://img.usecurling.com/p/400/500?q=clean%20minimal%20document&color=white',
                },
              ].map((tpl) => (
                <div
                  key={tpl.id}
                  className={`border-2 rounded-xl p-3 cursor-pointer transition-all group ${activeTemplate === tpl.id ? 'border-primary bg-primary/5 shadow-md' : 'border-muted hover:border-primary/50 bg-card'}`}
                  onClick={() => setActiveTemplate(tpl.id)}
                >
                  <div className="aspect-[3/4] bg-muted rounded-lg overflow-hidden mb-4 relative shadow-inner">
                    <img
                      src={tpl.img}
                      alt={tpl.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveTemplate(tpl.id)
                        }}
                      >
                        Selecionar
                      </Button>
                    </div>
                    {activeTemplate === tpl.id && (
                      <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs px-2.5 py-1 rounded-full font-bold shadow-md">
                        Ativo
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-lg">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tpl.desc}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cores da Marca</CardTitle>
              <CardDescription>
                Personalize a proposta com a identidade visual da sua empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-md">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cor Primária</Label>
                  <p className="text-xs text-muted-foreground">Usada em títulos e destaques.</p>
                </div>
                <Input
                  type="color"
                  value={formData.branding.primaryColor}
                  onChange={(e) => handleNestedChange('branding', 'primaryColor', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cor Secundária</Label>
                  <p className="text-xs text-muted-foreground">Usada em gráficos e detalhes.</p>
                </div>
                <Input
                  type="color"
                  value={formData.branding.secondaryColor}
                  onChange={(e) => handleNestedChange('branding', 'secondaryColor', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cor de Gradiente</Label>
                  <p className="text-xs text-muted-foreground">Usada em efeitos de fundo.</p>
                </div>
                <Input
                  type="color"
                  value={formData.branding.gradientColor || '#3b82f6'}
                  onChange={(e) => handleNestedChange('branding', 'gradientColor', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Páginas da Proposta</CardTitle>
              <CardDescription>Ative ou desative seções específicas do PDF final.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-lg">
              {[
                {
                  id: 'cover',
                  label: 'Página de Capa',
                  desc: 'Logo, dados do cliente e vendedor.',
                },
                { id: 'facade', label: 'Foto da Fachada', desc: 'Imagem ilustrativa do local.' },
                {
                  id: 'technical',
                  label: 'Dados Técnicos',
                  desc: 'Local de instalação e consumo.',
                },
                {
                  id: 'charts',
                  label: 'Gráficos de Geração',
                  desc: 'Comparativo Consumo vs Geração.',
                },
                {
                  id: 'system',
                  label: 'Sistema Proposto',
                  desc: 'Equipamentos e valor do investimento.',
                },
                { id: 'financial', label: 'Análise Financeira', desc: 'Payback, economia e ROI.' },
                { id: 'warranty', label: 'Garantias', desc: 'Tempo de garantia dos equipamentos.' },
                { id: 'schedule', label: 'Cronograma', desc: 'Etapas de execução do projeto.' },
                {
                  id: 'terms',
                  label: 'Termos e Condições',
                  desc: 'Formas de pagamento e validade.',
                },
              ].map((page) => (
                <div
                  key={page.id}
                  className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="space-y-0.5">
                    <Label className="text-base">{page.label}</Label>
                    <p className="text-sm text-muted-foreground">{page.desc}</p>
                  </div>
                  <Switch
                    checked={(formData.visible_pages as any)[page.id]}
                    onCheckedChange={(val) => handleNestedChange('visible_pages', page.id, val)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
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
                  value={formData.indicators.inflation}
                  onChange={(e) => handleNestedChange('indicators', 'inflation', e.target.value)}
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label>Taxa de Juros de Oportunidade (%)</Label>
                <Input
                  value={formData.indicators.interest}
                  onChange={(e) => handleNestedChange('indicators', 'interest', e.target.value)}
                  type="number"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tarifas" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tarifas Base</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>TUSD (R$/kWh)</Label>
                <Input
                  value={formData.tariffs.tusd}
                  onChange={(e) => handleNestedChange('tariffs', 'tusd', e.target.value)}
                  type="number"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label>TE (R$/kWh)</Label>
                <Input
                  value={formData.tariffs.te}
                  onChange={(e) => handleNestedChange('tariffs', 'te', e.target.value)}
                  type="number"
                  step="0.01"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
