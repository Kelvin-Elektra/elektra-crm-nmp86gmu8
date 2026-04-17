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
      .catch(() => {})
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

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Templates de Proposta</CardTitle>
              <CardDescription>Escolha o layout padrão das suas propostas geradas.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['modern', 'classic', 'minimal'].map((tpl) => (
                <div
                  key={tpl}
                  className={`border-2 rounded-xl p-2 cursor-pointer transition-all ${activeTemplate === tpl ? 'border-primary bg-primary/5' : 'border-transparent hover:border-primary/50'}`}
                  onClick={() => setActiveTemplate(tpl)}
                >
                  <div className="aspect-[3/4] bg-muted rounded-lg flex items-center justify-center overflow-hidden mb-3 relative">
                    <img
                      src={`https://img.usecurling.com/p/300/400?q=document,${tpl}&color=blue`}
                      alt={tpl}
                      className="w-full h-full object-cover opacity-80"
                    />
                    {activeTemplate === tpl && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full font-bold">
                        Ativo
                      </div>
                    )}
                  </div>
                  <p className="text-center font-medium capitalize">{tpl}</p>
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
    </div>
  )
}
