import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Zap,
  Boxes,
  Shield,
  Link as LinkIcon,
  DollarSign,
  Wrench,
  Building,
  Percent,
} from 'lucide-react'
import { DistributorsTab } from '@/components/pv-kit/DistributorsTab'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ModulesTab } from '@/components/pv-kit/ModulesTab'
import { InvertersTab } from '@/components/pv-kit/InvertersTab'
import { InstallationsTab } from '@/components/pv-kit/InstallationsTab'
import { CostsTab } from '@/components/pv-kit/CostsTab'
import { SuppliesTab } from '@/components/pv-kit/SuppliesTab'
import { TariffsTab } from '@/components/pv-kit/TariffsTab'
import { EfficiencyTab } from '@/components/pv-kit/EfficiencyTab'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

export default function PvKitSettings() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [settingsId, setSettingsId] = useState<string | null>(null)
  const [defaultPricingMode, setDefaultPricingMode] = useState('automatic')

  const isAdmin = user?.role === 'admin_elektra' || user?.role === 'admin_company'

  useEffect(() => {
    if (user?.company_id && isAdmin) {
      pb.collection('proposal_settings')
        .getFirstListItem(`company_id='${user.company_id}'`)
        .then((record) => {
          setSettingsId(record.id)
          setDefaultPricingMode(record.default_pricing_mode || 'automatic')
        })
        .catch(() => {})
    }
  }, [user, isAdmin])

  const updatePricingMode = async (val: string) => {
    setDefaultPricingMode(val)
    if (!user?.company_id) return
    try {
      if (settingsId) {
        await pb.collection('proposal_settings').update(settingsId, { default_pricing_mode: val })
      } else {
        const record = await pb.collection('proposal_settings').create({
          company_id: user.company_id,
          default_pricing_mode: val,
        })
        setSettingsId(record.id)
      }
      toast({ title: 'Configuração salva com sucesso.' })
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao salvar configuração.' })
    }
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl animate-fade-in pb-12 w-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações do Kit PV</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie distribuidoras, módulos, inversores, estruturas e precificação.
        </p>
      </div>

      <Tabs defaultValue="kit" className="w-full">
        <TabsList className="flex flex-wrap w-full h-auto gap-2 p-1 bg-muted/50 rounded-xl justify-start">
          <TabsTrigger value="kit" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            Formação do Kit PV
          </TabsTrigger>
          <TabsTrigger value="price" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            Formação do Preço de Venda PV
          </TabsTrigger>
          <TabsTrigger value="general" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            Configurações Gerais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kit" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Modo de Precificação Padrão</CardTitle>
              <CardDescription>
                Define se o valor do kit será calculado automaticamente pelas regras de insumos e
                equipamentos, ou inserido manualmente na geração da proposta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={defaultPricingMode}
                onValueChange={updatePricingMode}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="automatic" id="pm-auto" />
                  <Label htmlFor="pm-auto" className="cursor-pointer">
                    Automático (Recomendado)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="pm-manual" />
                  <Label htmlFor="pm-manual" className="cursor-pointer">
                    Manual
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Tabs
            defaultValue="distributors"
            className="w-full border rounded-xl overflow-hidden bg-white shadow-sm"
          >
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-slate-50 gap-0 overflow-x-auto flex-nowrap">
              <TabsTrigger
                value="distributors"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white rounded-none px-6 py-3 data-[state=active]:shadow-none"
              >
                <LinkIcon className="mr-2 h-4 w-4" /> Distribuidoras
              </TabsTrigger>
              <TabsTrigger
                value="modules"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white rounded-none px-6 py-3 data-[state=active]:shadow-none"
              >
                <Boxes className="mr-2 h-4 w-4" /> Módulos
              </TabsTrigger>
              <TabsTrigger
                value="inverters"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white rounded-none px-6 py-3 data-[state=active]:shadow-none"
              >
                <Zap className="mr-2 h-4 w-4" /> Inversores
              </TabsTrigger>
              <TabsTrigger
                value="supplies"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white rounded-none px-6 py-3 data-[state=active]:shadow-none"
              >
                <Wrench className="mr-2 h-4 w-4" /> Insumos
              </TabsTrigger>
            </TabsList>
            <div className="p-6">
              <TabsContent value="distributors" className="mt-0">
                <DistributorsTab />
              </TabsContent>
              <TabsContent value="modules" className="mt-0">
                <ModulesTab />
              </TabsContent>
              <TabsContent value="inverters" className="mt-0">
                <InvertersTab />
              </TabsContent>
              <TabsContent value="supplies" className="mt-0">
                <SuppliesTab />
              </TabsContent>
            </div>
          </Tabs>
        </TabsContent>

        <TabsContent value="price" className="mt-6">
          <Tabs
            defaultValue="costs"
            className="w-full border rounded-xl overflow-hidden bg-white shadow-sm"
          >
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-slate-50 gap-0 overflow-x-auto flex-nowrap">
              <TabsTrigger
                value="costs"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white rounded-none px-6 py-3 data-[state=active]:shadow-none"
              >
                <DollarSign className="mr-2 h-4 w-4" /> Custos e Impostos
              </TabsTrigger>
            </TabsList>
            <div className="p-6">
              <TabsContent value="costs" className="mt-0">
                <CostsTab />
              </TabsContent>
            </div>
          </Tabs>
        </TabsContent>

        <TabsContent value="general" className="mt-6">
          <Tabs
            defaultValue="installations"
            className="w-full border rounded-xl overflow-hidden bg-white shadow-sm"
          >
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-slate-50 gap-0 overflow-x-auto flex-nowrap">
              <TabsTrigger
                value="installations"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white rounded-none px-6 py-3 data-[state=active]:shadow-none"
              >
                <Shield className="mr-2 h-4 w-4" /> Instalação
              </TabsTrigger>
              <TabsTrigger
                value="tariffs"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white rounded-none px-6 py-3 data-[state=active]:shadow-none"
              >
                <Building className="mr-2 h-4 w-4" /> Concessionárias e Tarifas
              </TabsTrigger>
              <TabsTrigger
                value="efficiency"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-white rounded-none px-6 py-3 data-[state=active]:shadow-none"
              >
                <Percent className="mr-2 h-4 w-4" /> Eficiência PV
              </TabsTrigger>
            </TabsList>
            <div className="p-6">
              <TabsContent value="installations" className="mt-0">
                <InstallationsTab />
              </TabsContent>
              <TabsContent value="tariffs" className="mt-0">
                <TariffsTab />
              </TabsContent>
              <TabsContent value="efficiency" className="mt-0">
                <EfficiencyTab />
              </TabsContent>
            </div>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  )
}
