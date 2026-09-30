import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import { maskCNPJ } from '@/lib/masks'
import {
  Building2,
  User,
  FileText,
  Users,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
} from 'lucide-react'
import {
  CompanyLeadTimeItem,
  normalizeCompanyLeadTimes,
  getDefaultLeadTime,
} from '@/types/lead-time'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

interface TeamMember {
  id: string
  name: string
  email: string
  role?: string
  role_company?: string
  status?: string
  verified?: boolean
}

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('profile')
  const [company, setCompany] = useState<any>(null)
  const [systemSettings, setSystemSettings] = useState<any>(null)
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)

  const [profilePassword, setProfilePassword] = useState({
    oldPassword: '',
    password: '',
    passwordConfirm: '',
  })
  const [leadTimes, setLeadTimes] = useState<CompanyLeadTimeItem[]>([])
  const [newLeadTimeText, setNewLeadTimeText] = useState('')

  const loadCompany = async () => {
    if (user?.company_id && user.company_id.trim() !== '') {
      try {
        const record = await pb.collection('companies').getOne(user.company_id)
        setCompany(record)
        const normalized = normalizeCompanyLeadTimes(
          record.installation_lead_times,
          record.installation_lead_time,
        )
        setLeadTimes(normalized)
      } catch (err: any) {
        if (err.status !== 404) {
          toast({
            variant: 'destructive',
            title: 'Erro ao carregar empresa',
            description: 'Não foi possível carregar os dados da empresa.',
          })
        }
        setCompany(null)
      }
    }
  }

  const loadTeam = async () => {
    if (!user?.company_id) return
    setLoadingTeam(true)
    try {
      const records = await pb.collection('users').getFullList<TeamMember>({
        filter: `company_id = '${user.company_id}'`,
        sort: 'name',
      })
      setTeam(records)
    } catch {
      setTeam([])
    } finally {
      setLoadingTeam(false)
    }
  }

  const loadSystemSettings = async () => {
    try {
      const records = await pb.collection('system_settings').getFullList()
      if (records.length > 0) {
        setSystemSettings(records[0])
      }
    } catch {
      /* intentionally ignored */
    }
  }

  useEffect(() => {
    loadCompany()
    loadSystemSettings()
    loadTeam()
  }, [user?.company_id, user?.role])

  const handleUpdateProfilePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (profilePassword.password !== profilePassword.passwordConfirm) {
      toast({ variant: 'destructive', title: 'As novas senhas não coincidem.' })
      return
    }
    try {
      await pb.collection('users').update(user!.id, {
        oldPassword: profilePassword.oldPassword,
        password: profilePassword.password,
        passwordConfirm: profilePassword.passwordConfirm,
      })
      toast({ title: 'Senha atualizada com sucesso!' })
      setProfilePassword({ oldPassword: '', password: '', passwordConfirm: '' })
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      let errorMsg = err.message || 'Erro ao atualizar senha.'
      if (Object.keys(fieldErrors).length > 0) {
        errorMsg = Object.values(fieldErrors).join('. ')
      }
      toast({ variant: 'destructive', title: 'Erro', description: errorMsg })
    }
  }

  const handleAddLeadTime = () => {
    const text = newLeadTimeText.trim()
    if (!text) return
    const isFirst = leadTimes.length === 0
    const newItem: CompanyLeadTimeItem = {
      id: `lt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: text,
      is_default: isFirst,
    }
    setLeadTimes([...leadTimes, newItem])
    setNewLeadTimeText('')
  }

  const handleRemoveLeadTime = (id: string) => {
    const itemToRemove = leadTimes.find((i) => i.id === id)
    const filtered = leadTimes.filter((i) => i.id !== id)
    // Se o removido era o padrão e ainda restam itens, o primeiro vira padrão
    if (itemToRemove?.is_default && filtered.length > 0) {
      filtered[0].is_default = true
    }
    setLeadTimes(filtered)
  }

  const handleSetDefaultLeadTime = (id: string) => {
    setLeadTimes(
      leadTimes.map((item) => ({
        ...item,
        is_default: item.id === id,
      })),
    )
  }

  const handleLeadTimeLabelChange = (id: string, newLabel: string) => {
    setLeadTimes(leadTimes.map((item) => (item.id === id ? { ...item, label: newLabel } : item)))
  }

  const handleUpdateCompany = async () => {
    if (!company) return
    try {
      // Limpar itens vazios
      const cleanedLeadTimes = leadTimes
        .map((i) => ({ ...i, label: i.label.trim() }))
        .filter((i) => i.label !== '')

      // Garante no máximo um default
      const hasDefault = cleanedLeadTimes.some((i) => i.is_default)
      if (!hasDefault && cleanedLeadTimes.length > 0) {
        cleanedLeadTimes[0].is_default = true
      }

      const defaultTimeStr = getDefaultLeadTime(cleanedLeadTimes)

      const updated = await pb.collection('companies').update(company.id, {
        name: company.name,
        cnpj: company.cnpj || '',
        email: company.email || '',
        installation_lead_time: defaultTimeStr,
        installation_lead_times: cleanedLeadTimes,
        signature_owner_name: company.signature_owner_name || '',
        signature_owner_email: company.signature_owner_email || '',
      })
      setCompany(updated)
      setLeadTimes(cleanedLeadTimes)
      toast({ title: 'Dados da empresa atualizados com sucesso!' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    }
  }

  const isOwner =
    user?.role === 'User_owner' || user?.role === 'User_elektra' || user?.role_company === 'admin'

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie o perfil e preferências</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Tabs
            orientation="vertical"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="flex flex-col w-full h-auto items-start p-0 bg-transparent gap-2">
              <TabsTrigger
                value="profile"
                className="w-full justify-start rounded-none border-l-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary transition-all hover:bg-muted/50"
              >
                <User className="mr-2 h-4 w-4" /> Meu Perfil
              </TabsTrigger>
              <TabsTrigger
                value="company"
                className="w-full justify-start rounded-none border-l-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary transition-all hover:bg-muted/50"
              >
                <Building2 className="mr-2 h-4 w-4" /> Dados da Empresa
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="w-full justify-start rounded-none border-l-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary transition-all hover:bg-muted/50"
              >
                <Users className="mr-2 h-4 w-4" /> Equipe
              </TabsTrigger>
              {user?.role === 'User_elektra' && (
                <TabsTrigger
                  value="system"
                  className="w-full justify-start rounded-none border-l-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary transition-all hover:bg-muted/50"
                >
                  <Building2 className="mr-2 h-4 w-4" /> Sistema
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>

        <div className="md:col-span-3 space-y-6">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Atualize seus dados de acesso e perfil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" defaultValue={user?.name} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" defaultValue={user?.email} disabled />
                </div>
                <Separator className="my-4" />
                <form onSubmit={handleUpdateProfilePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Senha Atual</Label>
                    <Input
                      id="current_password"
                      type="password"
                      required
                      value={profilePassword.oldPassword}
                      onChange={(e) =>
                        setProfilePassword({ ...profilePassword, oldPassword: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nova Senha</Label>
                      <Input
                        type="password"
                        required
                        minLength={8}
                        value={profilePassword.password}
                        onChange={(e) =>
                          setProfilePassword({ ...profilePassword, password: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Confirmar Nova Senha</Label>
                      <Input
                        type="password"
                        required
                        minLength={8}
                        value={profilePassword.passwordConfirm}
                        onChange={(e) =>
                          setProfilePassword({
                            ...profilePassword,
                            passwordConfirm: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <Button type="submit">Salvar Alterações</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === 'company' && company && (
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Empresa</Label>
                    <Input
                      value={company?.name || ''}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      disabled={!isOwner}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CNPJ</Label>
                      <Input
                        value={company?.cnpj ? maskCNPJ(company.cnpj) : ''}
                        onChange={(e) => setCompany({ ...company, cnpj: maskCNPJ(e.target.value) })}
                        placeholder="00.000.000/0000-00"
                        className="bg-background"
                      />{' '}
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail da Empresa</Label>
                      <Input
                        type="email"
                        value={company?.email || ''}
                        onChange={(e) => setCompany({ ...company, email: e.target.value })}
                        disabled={!isOwner}
                        placeholder="contato@empresa.com.br"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-semibold">Prazos de Instalação</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Cadastre os prazos disponíveis e escolha qual será selecionado por padrão
                          nas propostas.
                        </p>
                      </div>
                    </div>

                    {/* Lista de prazos */}
                    <div className="space-y-2">
                      {leadTimes.length === 0 ? (
                        <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                          Nenhum prazo cadastrado. Adicione prazos abaixo para facilitar a criação
                          de propostas.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {leadTimes.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${
                                item.is_default
                                  ? 'bg-primary/5 border-primary/30'
                                  : 'bg-muted/20 border-border'
                              }`}
                            >
                              <button
                                type="button"
                                disabled={!isOwner}
                                onClick={() => handleSetDefaultLeadTime(item.id)}
                                title={item.is_default ? 'Prazo padrão' : 'Marcar como padrão'}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 ${
                                  item.is_default
                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
                                } ${!isOwner ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                              >
                                <CheckCircle2
                                  className={`h-3.5 w-3.5 ${item.is_default ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                                />
                                <span>{item.is_default ? 'Padrão' : 'Definir padrão'}</span>
                              </button>

                              <Input
                                value={item.label}
                                onChange={(e) => handleLeadTimeLabelChange(item.id, e.target.value)}
                                disabled={!isOwner}
                                placeholder="Ex: 30 a 45 dias úteis após aprovação"
                                className="h-8 text-sm flex-1 bg-background"
                              />

                              {isOwner && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                  onClick={() => handleRemoveLeadTime(item.id)}
                                  title="Remover prazo"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Adicionar novo prazo */}
                      {isOwner && (
                        <div className="flex gap-2 pt-1">
                          <Input
                            value={newLeadTimeText}
                            onChange={(e) => setNewLeadTimeText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddLeadTime()
                              }
                            }}
                            placeholder="Ex: 30 dias após assinatura do contrato"
                            className="text-sm h-9"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9 px-3 gap-1 shrink-0"
                            onClick={handleAddLeadTime}
                            disabled={!newLeadTimeText.trim()}
                          >
                            <Plus className="h-4 w-4" /> Adicionar
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      O item marcado como padrão será sugerido automaticamente ao gerar novas
                      propostas e negociações.
                    </p>
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-sm">Assinatura Digital de Documentos</h4>
                        <p className="text-xs text-muted-foreground">
                          Dados do responsável pela empresa para modelos que exigem assinatura do
                          proprietário/diretor.
                        </p>
                      </div>
                      <a
                        href="/modelos-documentos"
                        className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-3 gap-1.5"
                      >
                        <FileText className="h-3.5 w-3.5 text-primary" /> Modelos de Documentos
                      </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg border bg-muted/20">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Nome do Dono/Diretor da Empresa</Label>
                        <Input
                          value={company?.signature_owner_name || ''}
                          onChange={(e) =>
                            setCompany({ ...company, signature_owner_name: e.target.value })
                          }
                          disabled={!isOwner}
                          placeholder="Nome para assinatura"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">E-mail do Dono/Diretor</Label>
                        <Input
                          type="email"
                          value={company?.signature_owner_email || ''}
                          onChange={(e) =>
                            setCompany({ ...company, signature_owner_email: e.target.value })
                          }
                          disabled={!isOwner}
                          placeholder="email@empresa.com.br"
                        />
                      </div>
                    </div>
                  </div>

                  {isOwner && (
                    <Button onClick={handleUpdateCompany}>Salvar Dados da Empresa</Button>
                  )}
                </div>
                <div className="space-y-2 mt-6">
                  <Label>Logo da Empresa</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      className="flex-1"
                      onChange={async (e) => {
                        if (!e.target.files?.[0]) return
                        const fd = new FormData()
                        fd.append('logo', e.target.files[0])
                        const rec = await pb.collection('companies').update(company.id, fd)
                        setCompany(rec)
                        toast({ title: 'Logo atualizada' })
                      }}
                    />
                    {company?.logo && (
                      <div className="flex items-center gap-4 border p-2 rounded-lg bg-slate-50">
                        <img
                          src={pb.files.getURL(company, company.logo)}
                          alt="Logo"
                          className="h-12 object-contain"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          type="button"
                          onClick={async () => {
                            const rec = await pb
                              .collection('companies')
                              .update(company.id, { logo: null })
                            setCompany(rec)
                            toast({ title: 'Logo removida' })
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'team' && isOwner && (
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Equipe
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({team.filter((u) => u.status !== 'inactive').length} membros ativos)
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Visualização dos membros da sua equipe cadastrados na empresa.
                  </CardDescription>
                </div>
                {systemSettings?.hub_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 shrink-0"
                    onClick={() => window.open(systemSettings.hub_url, '_blank')}
                  >
                    <span>Gerenciar equipe no HUB</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs rounded-lg p-3">
                  <p className="font-medium">Gestão centralizada pelo HUB</p>
                  <p className="mt-0.5 text-muted-foreground">
                    A inclusão, edição de permissões e remoção de membros são realizadas diretamente
                    pelo HUB Elektra.
                  </p>
                </div>

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingTeam ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                            Carregando membros da equipe...
                          </TableCell>
                        </TableRow>
                      ) : team.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                            Nenhum membro encontrado.
                          </TableCell>
                        </TableRow>
                      ) : (
                        team.map((member) => (
                          <TableRow
                            key={member.id}
                            className={member.status === 'inactive' ? 'opacity-50 bg-slate-50' : ''}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span>{member.name || 'Sem nome'}</span>
                                {member.id === user?.id && (
                                  <Badge variant="secondary" className="text-[10px] py-0">
                                    Você
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{member.email}</TableCell>
                            <TableCell>
                              {member.role_company === 'admin' || member.role === 'User_owner' ? (
                                <Badge
                                  variant="outline"
                                  className="bg-blue-50 text-blue-700 hover:bg-blue-50 dark:bg-blue-950 dark:text-blue-300"
                                >
                                  Administrador
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-slate-50 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300"
                                >
                                  Usuário
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {member.status === 'inactive' ? (
                                <Badge
                                  variant="outline"
                                  className="bg-red-50 text-red-700 hover:bg-red-50 dark:bg-red-950 dark:text-red-300"
                                >
                                  Inativo
                                </Badge>
                              ) : member.verified ? (
                                <Badge
                                  variant="outline"
                                  className="bg-green-50 text-green-700 hover:bg-green-50 dark:bg-green-950 dark:text-green-300"
                                >
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 hover:bg-amber-50 dark:bg-amber-950 dark:text-amber-300"
                                >
                                  Pendente
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'system' && user?.role === 'User_elektra' && (
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Nome do Sistema</Label>
                  <div className="flex gap-2">
                    <Input
                      value={systemSettings?.system_name || ''}
                      onChange={(e) =>
                        setSystemSettings({ ...systemSettings, system_name: e.target.value })
                      }
                    />
                    <Button
                      onClick={async () => {
                        await pb
                          .collection('system_settings')
                          .update(systemSettings.id, { system_name: systemSettings.system_name })
                        toast({ title: 'Sucesso' })
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Informação de Suporte (Login)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={systemSettings?.support_info || ''}
                      onChange={(e) =>
                        setSystemSettings({ ...systemSettings, support_info: e.target.value })
                      }
                      placeholder="ex: suporte@elektrasolucoes.tech ou (11) 99999-9999"
                    />
                    <Button
                      onClick={async () => {
                        await pb
                          .collection('system_settings')
                          .update(systemSettings.id, { support_info: systemSettings.support_info })
                        toast({ title: 'Sucesso' })
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>URL do Hub</Label>
                  <div className="flex gap-2">
                    <Input
                      value={systemSettings?.hub_url || ''}
                      onChange={(e) =>
                        setSystemSettings({ ...systemSettings, hub_url: e.target.value })
                      }
                    />
                    <Button
                      onClick={async () => {
                        await pb
                          .collection('system_settings')
                          .update(systemSettings.id, { hub_url: systemSettings.hub_url })
                        toast({ title: 'Sucesso' })
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-4">
                  <Label>Imagem de Fundo (Login)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      if (!e.target.files?.[0]) return
                      const fd = new FormData()
                      fd.append('login_background', e.target.files[0])
                      const rec = await pb
                        .collection('system_settings')
                        .update(systemSettings.id, fd)
                      setSystemSettings(rec)
                      toast({ title: 'Imagem atualizada' })
                    }}
                  />
                  {systemSettings?.login_background && (
                    <img
                      src={pb.files.getURL(systemSettings, systemSettings.login_background)}
                      className="h-24 w-auto rounded border mt-2"
                      alt="bg"
                    />
                  )}
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Logo do Hub (Portal de Login)</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      if (!e.target.files?.[0]) return
                      const fd = new FormData()
                      fd.append('hub_logo', e.target.files[0])
                      const rec = await pb
                        .collection('system_settings')
                        .update(systemSettings.id, fd)
                      setSystemSettings(rec)
                      toast({ title: 'Logo atualizada' })
                    }}
                  />
                  {systemSettings?.hub_logo && (
                    <img
                      src={pb.files.getURL(systemSettings, systemSettings.hub_logo)}
                      className="h-16 w-auto object-contain mt-2"
                      alt="logo"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
