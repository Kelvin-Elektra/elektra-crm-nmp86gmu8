import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Save, FileImage, BarChart, Zap, DollarSign, Link as LinkIcon } from 'lucide-react'

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

  const handleNestedChange = (category: keyof typeof formData, field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: value },
    }))
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl animate-fade-in pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações da Proposta</h2>
          <p className="text-muted-foreground text-sm">
            Gerencie os padrões para geração de propostas comerciais.
          </p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="mr-2 h-4 w-4" /> Salvar
        </Button>
      </div>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto gap-2 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger value="templates" className="py-2.5 rounded-lg">
            <FileImage className="mr-2 h-4 w-4" /> Templates
          </TabsTrigger>
          <TabsTrigger value="indicadores" className="py-2.5 rounded-lg">
            <BarChart className="mr-2 h-4 w-4" /> Indicadores
          </TabsTrigger>
          <TabsTrigger value="tarifas" className="py-2.5 rounded-lg">
            <Zap className="mr-2 h-4 w-4" /> Tarifas
          </TabsTrigger>
          <TabsTrigger value="precificacao" className="py-2.5 rounded-lg">
            <DollarSign className="mr-2 h-4 w-4" /> Precificação
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="py-2.5 rounded-lg">
            <LinkIcon className="mr-2 h-4 w-4" /> Integrações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Templates Profissionais</CardTitle>
              <CardDescription>
                Selecione o layout padrão de alto impacto para as suas propostas comerciais.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  id: 'modern',
                  name: 'Modern Solar',
                  desc: 'Foco em gráficos e ROI com design arrojado.',
                  img: 'https://img.usecurling.com/p/400/500?q=modern%20document%20solar%20energy&color=blue',
                },
                {
                  id: 'technical',
                  name: 'Technical Detail',
                  desc: 'Layout técnico com especificações claras.',
                  img: 'https://img.usecurling.com/p/400/500?q=technical%20blueprint%20document&color=gray',
                },
                {
                  id: 'compact',
                  name: 'Compact Quote',
                  desc: 'Proposta direta focada em preço e fechamento.',
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <Button
                        variant="secondary"
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

          <Card>
            <CardHeader>
              <CardTitle>Preview do Conteúdo Mockado</CardTitle>
              <CardDescription>
                Veja como os dados serão distribuídos no template selecionado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 border rounded-xl bg-card shadow-sm flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4 w-full">
                  <div className="flex items-center gap-4 border-b pb-4">
                    <img
                      src="https://img.usecurling.com/i?q=solar%20energy&shape=fill&color=blue"
                      className="w-12 h-12 rounded-md object-cover"
                      alt="Logo"
                    />
                    <div>
                      <h4 className="font-bold text-lg">Elektra Engenharia</h4>
                      <p className="text-sm text-muted-foreground">Proposta para João da Silva</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Potência do Sistema</p>
                      <p className="font-semibold">6.6 kWp</p>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Geração Estimada</p>
                      <p className="font-semibold">800 kWh/mês</p>
                    </div>
                    <div className="bg-muted p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Payback</p>
                      <p className="font-semibold">3.2 Anos</p>
                    </div>
                    <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                      <p className="text-xs text-primary font-medium">Investimento</p>
                      <p className="font-bold text-primary">R$ 25.400,00</p>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-1/3 aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed relative overflow-hidden">
                  <img
                    src="https://img.usecurling.com/p/400/300?q=bar%20chart%20finance&color=blue"
                    alt="chart"
                    className="absolute inset-0 w-full h-full object-cover opacity-30"
                  />
                  <p className="text-sm text-muted-foreground text-center px-4 relative z-10 font-medium">
                    Gráfico de Viabilidade Financeira (Placeholder)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="indicadores" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Indicadores Econômicos</CardTitle>
              <CardDescription>
                Valores padrão para cálculo de viabilidade financeira.
              </CardDescription>
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

        <TabsContent value="precificacao" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Precificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label>Margem de Lucro Padrão (%)</Label>
                <Input
                  value={formData.pricing.margin}
                  onChange={(e) => handleNestedChange('pricing', 'margin', e.target.value)}
                  type="number"
                />
              </div>
              <div className="space-y-2">
                <Label>Impostos Médios (%)</Label>
                <Input
                  value={formData.pricing.tax}
                  onChange={(e) => handleNestedChange('pricing', 'tax', e.target.value)}
                  type="number"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>Conecte-se com plataformas de assinatura e ERPs.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                Em breve: Integração nativa com ZapSign e Asaas para emissão de cobranças e
                contratos digitais.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
