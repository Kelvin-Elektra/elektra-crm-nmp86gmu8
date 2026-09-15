import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LogOut,
  Play,
  ShieldCheck,
  Users,
  Building2,
  Terminal,
  Settings,
  SlidersHorizontal,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { TemplateMappingTab } from '@/components/TemplateMappingTab'
import { getTemplates, previewTemplate, GeneratorTemplate } from '@/services/templates'

export default function ElektraAdminDashboard() {
  const { realUser, logout, simulateUser } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [companies, setCompanies] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all')
  const [logs, setLogs] = useState<any[]>([])
  const [sysSettings, setSysSettings] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'companies' | 'templates' | 'settings' | 'logs'>(
    'companies',
  )

  // Estados para a aba Configuração de Templates
  const [templates, setTemplates] = useState<GeneratorTemplate[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [dynamicMappings, setDynamicMappings] = useState<Record<string, Record<string, string>>>({})
  const [proposalSettingsRecord, setProposalSettingsRecord] = useState<any>(null)
  const [sampleNegotiationData, setSampleNegotiationData] = useState<any>({})
  const [savingMappings, setSavingMappings] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (!realUser || realUser.role !== 'User_elektra') {
      navigate('/elektra-admin')
      return
    }
    loadData()
  }, [realUser, navigate])

  const loadData = async () => {
    try {
      const comps = await pb.collection('companies').getFullList({ sort: 'name' })
      setCompanies(comps)
      const usrs = await pb.collection('users').getFullList({ sort: 'name' })
      setUsers(usrs)
      const logRecords = await pb.send('/backend/v1/admin/logs', { method: 'GET' })
      setLogs(logRecords.items)

      const settingsRecord = await pb.collection('system_settings').getFirstListItem('')
      setSysSettings(settingsRecord)

      // Carregar templates do Gerador via endpoint existente
      loadTemplatesData(selectedCompanyId)
    } catch (err) {
      console.error(err)
    }
  }

  const loadTemplatesData = async (targetCompanyId?: string) => {
    setTemplatesLoading(true)
    try {
      const tpls = await getTemplates()
      setTemplates(tpls)

      // Determinar company_id efetivo para carregar proposal_settings
      const cId = targetCompanyId && targetCompanyId !== 'all' ? targetCompanyId : ''
      let pSettings: any = null
      if (cId) {
        try {
          pSettings = await pb
            .collection('proposal_settings')
            .getFirstListItem(`company_id="${cId}"`)
        } catch {
          /* intentionally ignored */
        }
      }
      if (!pSettings) {
        try {
          pSettings = await pb.collection('proposal_settings').getFirstListItem('')
        } catch {
          /* intentionally ignored */
        }
      }

      setProposalSettingsRecord(pSettings)

      if (pSettings && pSettings.dynamic_mappings) {
        let dm = pSettings.dynamic_mappings
        if (typeof dm === 'string') {
          try {
            dm = JSON.parse(dm)
          } catch {
            /* intentionally ignored */
          }
        }
        setDynamicMappings(dm && typeof dm === 'object' ? dm : {})
      } else {
        setDynamicMappings({})
      }

      // Buscar a negociação mais recente para servir como dados reais de amostra
      let negFilter = cId ? `company_id="${cId}"` : ''
      let recentNeg: any = null
      try {
        recentNeg = await pb.collection('negotiations').getFirstListItem(negFilter, {
          sort: '-created',
          expand: 'lead_id,company_id',
        })
      } catch (_) {
        try {
          recentNeg = await pb.collection('negotiations').getFirstListItem('', {
            sort: '-created',
            expand: 'lead_id,company_id',
          })
        } catch {
          /* intentionally ignored */
        }
      }

      if (recentNeg) {
        const lead = recentNeg.expand?.lead_id || {}
        const comp = recentNeg.expand?.company_id || {}
        setSampleNegotiationData({
          lead: {
            name: lead.name || 'Cliente de Demonstração',
            document: lead.document || '000.000.000-00',
            phone: lead.phone || '(11) 99999-9999',
            email: lead.email || 'cliente@exemplo.com.br',
            address: lead.address || 'Rua Solar das Flores, 123',
            city: lead.city || 'São Paulo',
            state: lead.state || 'SP',
            cep: lead.cep || '01001-000',
            neighborhood: lead.neighborhood || 'Centro',
            number: lead.number || '123',
          },
          negotiation: {
            title: recentNeg.title || 'Projeto Solar Fotovoltaico',
            validity: recentNeg.validity || '10 dias',
            payment_terms: recentNeg.payment_terms || 'À vista ou Financiamento',
            defined_payment_method: recentNeg.defined_payment_method || 'Financiamento 60x',
            accepted_payment_methods: recentNeg.accepted_payment_methods || 'Pix, Boleto, Cartão',
            installation_lead_time: recentNeg.installation_lead_time || '30 a 45 dias',
            notes: recentNeg.notes || '',
            description: recentNeg.description || '',
            uc: recentNeg.uc || '12345678',
          },
          sizing: {
            kit_power_kwp: recentNeg.sizing_kit_power_kwp || 8.5,
            avg_consumption: recentNeg.sizing_avg_consumption || 750,
            estimated_monthly_generation: recentNeg.sizing_estimated_generation || 950,
            module_qty: recentNeg.sizing_module_qty || 16,
            consumer_category: recentNeg.sizing_consumer_category || 'Residencial',
            concessionaire: recentNeg.sizing_concessionaire || 'Enel',
            roof_type: recentNeg.sizing_roof_type || 'Telhado Cerâmico',
            network_type: recentNeg.sizing_network_type || 'Bifásico',
            simultaneity_factor: recentNeg.sizing_simultaneity || 30,
            address_struct: {
              city: lead.city || 'São Paulo',
              state: lead.state || 'SP',
              street: lead.address || 'Rua Solar das Flores',
              number: lead.number || '123',
              zip: lead.cep || '01001-000',
            },
          },
          financial: {
            total_investment: recentNeg.financial_total_investment || 28500,
            monthly_savings: recentNeg.financial_monthly_savings || 680,
            annual_savings: recentNeg.financial_annual_savings || 8160,
            savings_25_years: recentNeg.financial_savings_25_years || 204000,
            payback_years: recentNeg.financial_payback_years || 3.5,
            payback_months: recentNeg.financial_payback_months || 42,
            tariff_rate: recentNeg.financial_tariff_rate || 0.95,
            tariff_details: {
              te: 0.42,
              tusd: 0.53,
            },
            subtotal: recentNeg.financial_total_investment || 28500,
            discount_amount: 0,
          },
          company: {
            name: comp.name || 'Elektra Solar',
            cnpj: comp.cnpj || '00.000.000/0001-00',
            phone: comp.phone || '(11) 3000-0000',
            email: comp.email || 'contato@elektrasolar.com.br',
          },
        })
      } else {
        // Dados de fallback estruturados para simular variáveis
        setSampleNegotiationData({
          lead: {
            name: 'Cliente Modelo de Teste',
            document: '123.456.789-00',
            phone: '(11) 98765-4321',
            email: 'cliente.teste@exemplo.com.br',
            address: 'Av. Paulista, 1000',
            city: 'São Paulo',
            state: 'SP',
            cep: '01310-100',
          },
          negotiation: {
            title: 'Proposta Fotovoltaica Residencial',
            validity: '15 dias',
            payment_terms: 'Entrada + 36x',
            installation_lead_time: '30 dias',
          },
          sizing: {
            kit_power_kwp: 7.2,
            avg_consumption: 650,
            estimated_monthly_generation: 880,
            module_qty: 14,
            consumer_category: 'Residencial',
          },
          financial: {
            total_investment: 24900,
            monthly_savings: 590,
            annual_savings: 7080,
            payback_years: 3.5,
            tariff_rate: 0.92,
          },
          company: {
            name: 'Elektra Solar Demo',
          },
        })
      }
    } catch (err) {
      console.error('Erro ao carregar dados de templates:', err)
    } finally {
      setTemplatesLoading(false)
    }
  }

  // Recarregar dados de template se a empresa selecionada mudar
  useEffect(() => {
    if (realUser && realUser.role === 'User_elektra') {
      loadTemplatesData(selectedCompanyId)
    }
  }, [selectedCompanyId])

  const handleSaveDynamicMappings = async (
    templateId: string,
    mappingsForTemplate: Record<string, string>,
  ) => {
    setSavingMappings(true)
    try {
      const updatedDm: Record<string, Record<string, string>> = {
        ...dynamicMappings,
        [templateId]: mappingsForTemplate,
      }

      // Se todas as chaves do template forem automáticas, manter objeto limpo
      if (Object.keys(mappingsForTemplate).length === 0) {
        delete updatedDm[templateId]
      }

      let targetId = proposalSettingsRecord?.id
      let compId = selectedCompanyId && selectedCompanyId !== 'all' ? selectedCompanyId : undefined

      if (!targetId) {
        // Criar registro de proposal_settings
        const created = await pb.collection('proposal_settings').create({
          company_id: compId,
          dynamic_mappings: updatedDm,
        })
        setProposalSettingsRecord(created)
      } else {
        const updated = await pb.collection('proposal_settings').update(targetId, {
          dynamic_mappings: updatedDm,
        })
        setProposalSettingsRecord(updated)
      }

      setDynamicMappings(updatedDm)
      toast({
        title: 'Mapeamento Salvo',
        description: `Mapeamento do template "${templateId}" gravado com sucesso.`,
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao Salvar Mapeamento',
        description: err?.message || 'Falha ao persistir no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSavingMappings(false)
    }
  }

  const handlePreviewTemplateAction = async (
    template: GeneratorTemplate,
    customMappings?: Record<string, string>,
  ) => {
    setPreviewLoading(true)
    try {
      const compId =
        selectedCompanyId && selectedCompanyId !== 'all' ? selectedCompanyId : undefined

      // Salvar temporariamente para o preview refletir o override que está em tela se fornecido
      if (customMappings && proposalSettingsRecord?.id) {
        try {
          const merged = {
            ...dynamicMappings,
            [template.id]: customMappings,
          }
          await pb.collection('proposal_settings').update(proposalSettingsRecord.id, {
            dynamic_mappings: merged,
          })
          setDynamicMappings(merged)
        } catch {
          /* intentionally ignored */
        }
      }

      const res = await previewTemplate(template.id, sampleNegotiationData, compId)
      if (res && res.preview_url) {
        window.open(res.preview_url, '_blank', 'noopener,noreferrer')
        toast({
          title: 'Preview Gerado',
          description: 'A pré-visualização do modelo foi aberta em uma nova guia.',
        })
      } else {
        toast({
          title: 'Preview Indisponível',
          description: 'O Gerador não retornou preview_url para este modelo.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro na Visualização',
        description: err?.message || 'Falha ao solicitar preview do template ao Gerador.',
        variant: 'destructive',
      })
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0]
    if (!file || !sysSettings) return

    const formData = new FormData()
    formData.append(field, file)

    try {
      const updated = await pb.collection('system_settings').update(sysSettings.id, formData)
      setSysSettings(updated)
      toast({ title: 'Sucesso', description: 'Imagem atualizada com sucesso.' })
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao atualizar imagem.', variant: 'destructive' })
    }
  }

  const handleSimulateUser = (user: any) => {
    simulateUser(user)
    toast({ title: 'Simulação Iniciada', description: `Navegando como ${user.name}` })
    navigate('/dashboard')
  }

  const filteredUsers =
    selectedCompanyId && selectedCompanyId !== 'all'
      ? users.filter((u) => u.company_id === selectedCompanyId)
      : users

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-950 text-white py-4 px-6 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-blue-500" />
          <h1 className="text-xl font-bold">Elektra Admin</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">{realUser?.email}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout()
              navigate('/elektra-admin')
            }}
            className="text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 mt-6 space-y-6">
        <div className="flex gap-4 border-b pb-4 overflow-x-auto whitespace-nowrap scrollbar-none">
          <Button
            variant={activeTab === 'companies' ? 'default' : 'outline'}
            onClick={() => setActiveTab('companies')}
          >
            <Building2 className="h-4 w-4 mr-2" /> Empresas e Simulação
          </Button>
          <Button
            variant={activeTab === 'templates' ? 'default' : 'outline'}
            onClick={() => setActiveTab('templates')}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" /> Configuração de Templates
          </Button>
          <Button
            variant={activeTab === 'settings' ? 'default' : 'outline'}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="h-4 w-4 mr-2" /> Configurações do Sistema
          </Button>
          <Button
            variant={activeTab === 'logs' ? 'default' : 'outline'}
            onClick={() => setActiveTab('logs')}
          >
            <Terminal className="h-4 w-4 mr-2" /> Logs de Sistema
          </Button>
        </div>

        {activeTab === 'companies' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Filtro Global</CardTitle>
                  <CardDescription>Selecione uma empresa para ver seus usuários</CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as Empresas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Empresas</SelectItem>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Métricas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center bg-white p-3 border rounded-lg">
                    <span className="text-muted-foreground flex items-center">
                      <Building2 className="h-4 w-4 mr-2" /> Empresas
                    </span>
                    <span className="font-bold">{companies.length}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white p-3 border rounded-lg">
                    <span className="text-muted-foreground flex items-center">
                      <Users className="h-4 w-4 mr-2" /> Usuários
                    </span>
                    <span className="font-bold">{users.length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Usuários e Simulação</CardTitle>
                  <CardDescription>
                    Selecione um usuário para simular a visão dele no CRM.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredUsers.map((u) => {
                      const comp = companies.find((c) => c.id === u.company_id)
                      return (
                        <div
                          key={u.id}
                          className="flex items-center justify-between p-4 bg-white border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div>
                            <p className="font-medium">{u.name || 'Sem nome'}</p>
                            <div className="flex gap-2 text-sm text-muted-foreground items-center mt-1">
                              <span>{u.email}</span>
                              <span>•</span>
                              <span className="px-2 py-0.5 bg-slate-100 rounded-md text-xs">
                                {comp?.name || 'Sem Empresa'}
                              </span>
                              <span>•</span>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs capitalize">
                                {u.role_company || u.role}
                              </span>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => handleSimulateUser(u)}>
                            <Play className="h-4 w-4 mr-2" /> Simular Visão
                          </Button>
                        </div>
                      )
                    })}
                    {filteredUsers.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhum usuário encontrado.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <TemplateMappingTab
            templates={templates}
            templatesLoading={templatesLoading}
            activeCompanyId={selectedCompanyId}
            companies={companies}
            dynamicMappings={dynamicMappings}
            sampleNegotiationData={sampleNegotiationData}
            onSaveMappings={handleSaveDynamicMappings}
            onPreviewTemplate={handlePreviewTemplateAction}
            previewLoading={previewLoading}
            saving={savingMappings}
          />
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Identidade Visual</CardTitle>
                <CardDescription>Logo principal e ícone do sistema</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Logo Principal (Login e Header)</Label>
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-40 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-dashed">
                      {sysSettings?.logo ? (
                        <img
                          src={pb.files.getURL(sysSettings, sysSettings.logo)}
                          alt="Logo"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem logo</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Recomendado: PNG transparente, max 2MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <Label>Ícone da Sidebar</Label>
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-dashed">
                      {sysSettings?.sidebar_icon ? (
                        <img
                          src={pb.files.getURL(sysSettings, sysSettings.sidebar_icon)}
                          alt="Icon"
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem ícone</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'sidebar_icon')}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Recomendado: Ícone quadrado PNG/SVG.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Experiência de Login</CardTitle>
                <CardDescription>Personalize a tela de acesso ao CRM</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Background de Login</Label>
                  <div className="flex flex-col gap-4">
                    <div className="w-full aspect-video bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border border-dashed relative group">
                      {sysSettings?.login_background ? (
                        <img
                          src={pb.files.getURL(sysSettings, sysSettings.login_background)}
                          alt="Login Background"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">Sem background</span>
                      )}
                    </div>
                    <div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'login_background')}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Recomendado: 1920x1080 (16:9), max 5MB.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <Label>Contato de Suporte</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: 46999999"
                      value={sysSettings?.support_info || ''}
                      onChange={(e) =>
                        setSysSettings({ ...sysSettings, support_info: e.target.value })
                      }
                    />
                    <Button
                      onClick={async () => {
                        try {
                          const updated = await pb
                            .collection('system_settings')
                            .update(sysSettings.id, {
                              support_info: sysSettings.support_info,
                            })
                          setSysSettings(updated)
                          toast({ title: 'Sucesso', description: 'Contato de suporte atualizado.' })
                        } catch (err) {
                          toast({
                            title: 'Erro',
                            description: 'Falha ao salvar.',
                            variant: 'destructive',
                          })
                        }
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Exibido no rodapé da página de login.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'logs' && (
          <Card>
            <CardHeader>
              <CardTitle>Logs do PocketBase</CardTitle>
              <CardDescription>Últimos 50 eventos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-950 text-slate-300 p-4 rounded-lg font-mono text-sm overflow-x-auto h-[600px] overflow-y-auto">
                {logs.map((l, i) => (
                  <div key={i} className="mb-2 border-b border-slate-800 pb-2">
                    <span className="text-slate-500">[{l.created}]</span>{' '}
                    <span
                      className={
                        l.level === 'error'
                          ? 'text-red-400'
                          : l.level === 'warn'
                            ? 'text-yellow-400'
                            : 'text-blue-400'
                      }
                    >
                      {l.level?.toUpperCase()}
                    </span>{' '}
                    <span className="text-white">{l.message}</span>
                    {l.data && Object.keys(l.data).length > 0 && (
                      <pre className="text-slate-400 mt-1 pl-4 border-l-2 border-slate-800">
                        {JSON.stringify(l.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
