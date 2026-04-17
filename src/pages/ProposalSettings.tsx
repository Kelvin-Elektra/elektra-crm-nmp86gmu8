import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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
  const [previewTemplate, setPreviewTemplate] = useState<any>(null)

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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4 gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveTemplate(tpl.id)
                        }}
                      >
                        Selecionar
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full shadow-lg"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPreviewTemplate(tpl)
                        }}
                      >
                        Preview Ampliado
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

      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto p-0 border-none bg-zinc-100">
          <div className="bg-white text-slate-900 w-full min-h-full shadow-2xl">
            <div className="p-8 md:p-16 space-y-10">
              <header className="flex justify-between items-start border-b pb-8">
                <img
                  src="https://img.usecurling.com/i?q=solar%20energy&shape=fill&color=blue"
                  className="w-16 h-16 rounded-lg"
                  alt="Logo"
                />
                <div className="text-right">
                  <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">
                    Proposta Comercial
                  </h1>
                  <p className="text-slate-500 mt-2 font-medium">Sistema Fotovoltaico 6.6 kWp</p>
                  <p className="text-slate-400 text-sm">Validade: 15 dias</p>
                </div>
              </header>

              <section>
                <h2 className="text-xl font-bold text-slate-800 border-b-2 border-primary inline-block mb-4 pb-1">
                  Detalhes do Cliente
                </h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm bg-slate-50 p-6 rounded-xl">
                  <p>
                    <strong className="text-slate-700">Nome:</strong> João da Silva
                  </p>
                  <p>
                    <strong className="text-slate-700">Telefone:</strong> (11) 98765-4321
                  </p>
                  <p>
                    <strong className="text-slate-700">Endereço:</strong> Rua das Flores, 123,
                    Bairro Solar
                  </p>
                  <p>
                    <strong className="text-slate-700">Consumo Médio:</strong> 800 kWh/mês
                  </p>
                </div>
              </section>

              <section className="grid md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 border-b-2 border-primary inline-block mb-4 pb-1">
                    O Sistema Proposto
                  </h2>
                  <ul className="space-y-3 text-sm">
                    <li className="flex justify-between border-b pb-2">
                      <strong className="text-slate-600">Potência Instalada:</strong>{' '}
                      <span>6.6 kWp</span>
                    </li>
                    <li className="flex justify-between border-b pb-2">
                      <strong className="text-slate-600">Módulos Solares:</strong>{' '}
                      <span>12x 550W (Tier 1)</span>
                    </li>
                    <li className="flex justify-between border-b pb-2">
                      <strong className="text-slate-600">Inversor:</strong>{' '}
                      <span>1x 5kW (Monitoramento Wi-Fi)</span>
                    </li>
                    <li className="flex justify-between border-b pb-2">
                      <strong className="text-slate-600">Área Necessária:</strong>{' '}
                      <span>~30 m²</span>
                    </li>
                    <li className="flex justify-between border-b pb-2">
                      <strong className="text-slate-600">Geração Estimada:</strong>{' '}
                      <span className="font-semibold text-primary">815 kWh/mês</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-primary/5 p-6 rounded-xl border border-primary/20 shadow-sm flex flex-col justify-center">
                  <h3 className="font-bold text-lg mb-4 text-center text-primary">
                    Investimento Total
                  </h3>
                  <div className="text-center">
                    <p className="text-4xl font-black text-slate-900">R$ 25.400,00</p>
                    <p className="text-xs font-medium text-slate-500 mt-2 uppercase tracking-widest">
                      À vista ou financiado em até 84x
                    </p>
                  </div>
                  <div className="mt-8 space-y-3 text-sm">
                    <div className="flex justify-between border-b border-primary/10 pb-2">
                      <span className="text-slate-600">Equipamentos do Kit</span>
                      <span className="font-medium">R$ 18.000,00</span>
                    </div>
                    <div className="flex justify-between border-b border-primary/10 pb-2">
                      <span className="text-slate-600">Mão de Obra e Projeto</span>
                      <span className="font-medium">R$ 7.400,00</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-slate-800 border-b-2 border-primary inline-block mb-6 pb-1">
                  Análise Financeira e Retorno
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white border shadow-sm p-5 rounded-xl transition-transform hover:-translate-y-1">
                    <p className="text-slate-500 text-xs font-medium uppercase mb-2">
                      Economia Mensal
                    </p>
                    <p className="font-bold text-2xl text-green-600">~R$ 750</p>
                  </div>
                  <div className="bg-white border shadow-sm p-5 rounded-xl transition-transform hover:-translate-y-1">
                    <p className="text-slate-500 text-xs font-medium uppercase mb-2">Payback</p>
                    <p className="font-bold text-2xl text-slate-800">3.2 anos</p>
                  </div>
                  <div className="bg-white border shadow-sm p-5 rounded-xl transition-transform hover:-translate-y-1">
                    <p className="text-slate-500 text-xs font-medium uppercase mb-2">
                      Economia 25 anos
                    </p>
                    <p className="font-bold text-2xl text-primary">R$ 225k</p>
                  </div>
                  <div className="bg-white border shadow-sm p-5 rounded-xl transition-transform hover:-translate-y-1">
                    <p className="text-slate-500 text-xs font-medium uppercase mb-2">
                      Retorno (TIR)
                    </p>
                    <p className="font-bold text-2xl text-slate-800">28% a.a.</p>
                  </div>
                </div>
              </section>

              <footer className="pt-16 border-t text-center">
                <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">
                  Documento gerado automaticamente pelo Elektra CRM
                </p>
                <Button
                  className="mt-8 px-8 rounded-full shadow-lg"
                  onClick={() => setPreviewTemplate(null)}
                >
                  Fechar Visualização
                </Button>
              </footer>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
