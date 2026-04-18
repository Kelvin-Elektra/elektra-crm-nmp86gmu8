import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap, Boxes, Shield, Settings, Link as LinkIcon, DollarSign } from 'lucide-react'
import { DistributorsTab } from '@/components/pv-kit/DistributorsTab'
import { ModulesTab } from '@/components/pv-kit/ModulesTab'
import { InvertersTab } from '@/components/pv-kit/InvertersTab'
import { InstallationsTab } from '@/components/pv-kit/InstallationsTab'
import { CostsTab } from '@/components/pv-kit/CostsTab'

export default function PvKitSettings() {
  return (
    <div className="flex flex-col gap-6 max-w-6xl animate-fade-in pb-12 w-full">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações do Kit PV</h2>
        <p className="text-muted-foreground text-sm">
          Gerencie distribuidoras, módulos, inversores, estruturas e precificação.
        </p>
      </div>

      <Tabs defaultValue="distributors" className="w-full">
        <TabsList className="flex flex-wrap w-full h-auto gap-2 p-1 bg-muted/50 rounded-xl justify-start">
          <TabsTrigger value="distributors" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <LinkIcon className="mr-2 h-4 w-4" /> Distribuidoras
          </TabsTrigger>
          <TabsTrigger value="modules" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <Boxes className="mr-2 h-4 w-4" /> Módulos
          </TabsTrigger>
          <TabsTrigger value="inverters" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <Zap className="mr-2 h-4 w-4" /> Inversores
          </TabsTrigger>
          <TabsTrigger value="installations" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <Shield className="mr-2 h-4 w-4" /> Instalação
          </TabsTrigger>
          <TabsTrigger value="costs" className="py-2.5 rounded-lg flex-1 sm:flex-none">
            <DollarSign className="mr-2 h-4 w-4" /> Custos de Projeto
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="distributors">
            <DistributorsTab />
          </TabsContent>
          <TabsContent value="modules">
            <ModulesTab />
          </TabsContent>
          <TabsContent value="inverters">
            <InvertersTab />
          </TabsContent>
          <TabsContent value="installations">
            <InstallationsTab />
          </TabsContent>
          <TabsContent value="costs">
            <CostsTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
