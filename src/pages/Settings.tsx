import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { Building2, User, Users, Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Collections } from '@/lib/pocketbase/collections'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('profile')
  const [company, setCompany] = useState<any>(null)
  const [systemSettings, setSystemSettings] = useState<any>(null)

  const [profilePassword, setProfilePassword] = useState({
    oldPassword: '',
    password: '',
    passwordConfirm: '',
  })

  const loadCompany = async () => {
    if (user?.company_id && user.company_id.trim() !== '') {
      try {
        const record = await pb.collection(Collections.COMPANIES).getOne(user.company_id)
        setCompany(record)
      } catch (err) {
        console.error('Company not found:', err)
        toast({
          variant: 'destructive',
          title: 'Empresa não encontrada',
          description: 'A empresa associada ao seu usuário não foi encontrada ou foi removida.',
        })
        setCompany(null)
      }
    }
  }

  const loadSystemSettings = async () => {
    if (user?.role === 'User_elektra') {
      try {
        const records = await pb.collection('system_settings').getFullList()
        if (records.length > 0) {
          setSystemSettings(records[0])
        } else {
          const newRecord = await pb
            .collection('system_settings')
            .create({ system_name: 'Elektra CRM' })
          setSystemSettings(newRecord)
        }
      } catch (err) {
        console.error(err)
      }
    }
  }

  useEffect(() => {
    loadCompany()
    loadSystemSettings()
  }, [user?.company_id, user?.role])

  const handleUpdateProfilePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (profilePassword.password !== profilePassword.passwordConfirm) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: 'As novas senhas não coincidem.',
      })
      return
    }
    try {
      await pb.collection(Collections.USERS).update(user!.id, {
        oldPassword: profilePassword.oldPassword,
        password: profilePassword.password,
        passwordConfirm: profilePassword.passwordConfirm,
      })
      toast({ title: 'Sucesso', description: 'Senha atualizada com sucesso!' })
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

  const handleUpdateCompanyName = async () => {
    if (!company) return
    try {
      const formData = new FormData()
      formData.append('name', company.name)
      await pb.collection(Collections.COMPANIES).update(company.id, formData)
      toast({ title: 'Sucesso', description: 'Nome da empresa atualizado com sucesso!' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    }
  }

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
                className="w-full justify-start rounded-none border-l-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/50"
              >
                <User className="mr-2 h-4 w-4" /> Meu Perfil
              </TabsTrigger>
              <TabsTrigger
                value="company"
                className="w-full justify-start rounded-none border-l-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/50"
              >
                <Building2 className="mr-2 h-4 w-4" /> Dados da Empresa
              </TabsTrigger>
              {user?.role === 'User_elektra' && (
                <TabsTrigger
                  value="system"
                  className="w-full justify-start rounded-none border-l-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/50"
                >
                  <Building2 className="mr-2 h-4 w-4" /> Configurações do Sistema
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>

        <div className="md:col-span-3 space-y-6">
          {activeTab === 'system' && user?.role === 'User_elektra' && (
            <Card>
              <CardHeader>
                <CardTitle>Configurações do Sistema</CardTitle>
                <CardDescription>
                  Gerencie o nome e a logomarca da aplicação (visível para todos os usuários e
                  clientes).
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                        try {
                          await pb
                            .collection('system_settings')
                            .update(systemSettings.id, { system_name: systemSettings.system_name })
                          toast({ title: 'Sucesso', description: 'Nome atualizado com sucesso!' })
                        } catch (err: any) {
                          toast({ variant: 'destructive', title: 'Erro', description: err.message })
                        }
                      }}
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 mt-6">
                  <Label>Logomarca Global (Cabeçalho)</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      className="flex-1"
                      onChange={async (e) => {
                        if (!e.target.files || !e.target.files[0]) return
                        try {
                          const formData = new FormData()
                          formData.append('logo', e.target.files[0])
                          const updated = await pb
                            .collection('system_settings')
                            .update(systemSettings.id, formData)
                          setSystemSettings(updated)
                          toast({
                            title: 'Sucesso',
                            description: 'Logomarca atualizada com sucesso!',
                          })
                        } catch (err: any) {
                          toast({
                            variant: 'destructive',
                            title: 'Erro',
                            description: 'Falha ao fazer upload da logo.',
                          })
                        }
                      }}
                    />
                    {systemSettings?.logo && (
                      <div className="flex items-center gap-4 border p-2 rounded-lg bg-slate-50">
                        <img
                          src={pb.files.getURL(systemSettings, systemSettings.logo)}
                          alt="Logo"
                          className="h-12 object-contain"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          type="button"
                          onClick={async () => {
                            try {
                              const updated = await pb
                                .collection('system_settings')
                                .update(systemSettings.id, { logo: null })
                              setSystemSettings(updated)
                              toast({ title: 'Sucesso', description: 'Logo removida.' })
                            } catch (e) {
                              toast({
                                variant: 'destructive',
                                title: 'Erro',
                                description: 'Falha ao remover.',
                              })
                            }
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 mt-6 border-t pt-6">
                  <Label>Ícone da Barra Lateral (Sidebar)</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      className="flex-1"
                      onChange={async (e) => {
                        if (!e.target.files || !e.target.files[0]) return
                        try {
                          const formData = new FormData()
                          formData.append('sidebar_icon', e.target.files[0])
                          const updated = await pb
                            .collection('system_settings')
                            .update(systemSettings.id, formData)
                          setSystemSettings(updated)
                          toast({
                            title: 'Sucesso',
                            description: 'Ícone atualizado com sucesso!',
                          })
                        } catch (err: any) {
                          toast({
                            variant: 'destructive',
                            title: 'Erro',
                            description: 'Falha ao fazer upload do ícone.',
                          })
                        }
                      }}
                    />
                    {systemSettings?.sidebar_icon && (
                      <div className="flex items-center gap-4 border p-2 rounded-lg bg-slate-50">
                        <img
                          src={pb.files.getURL(systemSettings, systemSettings.sidebar_icon)}
                          alt="Sidebar Icon"
                          className="h-12 object-contain"
                        />
                        <Button
                          variant="destructive"
                          size="sm"
                          type="button"
                          onClick={async () => {
                            try {
                              const updated = await pb
                                .collection('system_settings')
                                .update(systemSettings.id, { sidebar_icon: null })
                              setSystemSettings(updated)
                              toast({ title: 'Sucesso', description: 'Ícone removido.' })
                            } catch (e) {
                              toast({
                                variant: 'destructive',
                                title: 'Erro',
                                description: 'Falha ao remover.',
                              })
                            }
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mt-6 border-t pt-6">
                  <h3 className="font-semibold text-lg">Configurações do Elektra Hub</h3>
                  <div className="space-y-2">
                    <Label>URL do Hub</Label>
                    <div className="flex gap-2">
                      <Input
                        value={systemSettings?.hub_url || ''}
                        onChange={(e) =>
                          setSystemSettings({ ...systemSettings, hub_url: e.target.value })
                        }
                        placeholder="https://hub.elektrasolucoes.tech/"
                      />
                      <Button
                        onClick={async () => {
                          try {
                            await pb
                              .collection('system_settings')
                              .update(systemSettings.id, { hub_url: systemSettings.hub_url })
                            toast({ title: 'Sucesso', description: 'URL do Hub atualizada!' })
                          } catch (err: any) {
                            toast({
                              variant: 'destructive',
                              title: 'Erro',
                              description: err.message,
                            })
                          }
                        }}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label>Descrição na Página de Login</Label>
                    <div className="flex gap-2">
                      <Input
                        value={systemSettings?.hub_description || ''}
                        onChange={(e) =>
                          setSystemSettings({ ...systemSettings, hub_description: e.target.value })
                        }
                      />
                      <Button
                        onClick={async () => {
                          try {
                            await pb.collection('system_settings').update(systemSettings.id, {
                              hub_description: systemSettings.hub_description,
                            })
                            toast({ title: 'Sucesso', description: 'Descrição atualizada!' })
                          } catch (err: any) {
                            toast({
                              variant: 'destructive',
                              title: 'Erro',
                              description: err.message,
                            })
                          }
                        }}
                      >
                        Salvar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 mt-6">
                    <Label>Logomarca do Hub (Portal de Login)</Label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <Input
                        type="file"
                        accept="image/*"
                        className="flex-1"
                        onChange={async (e) => {
                          if (!e.target.files || !e.target.files[0]) return
                          try {
                            const formData = new FormData()
                            formData.append('hub_logo', e.target.files[0])
                            const updated = await pb
                              .collection('system_settings')
                              .update(systemSettings.id, formData)
                            setSystemSettings(updated)
                            toast({
                              title: 'Sucesso',
                              description: 'Logomarca do Hub atualizada!',
                            })
                          } catch (err: any) {
                            toast({
                              variant: 'destructive',
                              title: 'Erro',
                              description: 'Falha ao fazer upload da logo do hub.',
                            })
                          }
                        }}
                      />
                      {systemSettings?.hub_logo && (
                        <div className="flex items-center gap-4 border p-2 rounded-lg bg-slate-50">
                          <img
                            src={pb.files.getURL(systemSettings, systemSettings.hub_logo)}
                            alt="Hub Logo"
                            className="h-12 object-contain"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            type="button"
                            onClick={async () => {
                              try {
                                const updated = await pb
                                  .collection('system_settings')
                                  .update(systemSettings.id, { hub_logo: null })
                                setSystemSettings(updated)
                                toast({ title: 'Sucesso', description: 'Logo do Hub removida.' })
                              } catch (e) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Erro',
                                  description: 'Falha ao remover.',
                                })
                              }
                            }}
                          >
                            Remover
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado por segurança.
                  </p>
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
                      <Label htmlFor="new_password">Nova Senha</Label>
                      <Input
                        id="new_password"
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
                      <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                      <Input
                        id="confirm_password"
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

          {activeTab === 'company' && (
            <Card>
              <CardHeader>
                <CardTitle>Dados da Empresa</CardTitle>
                <CardDescription>Informações gerais da sua organização.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>Nome da Empresa</Label>
                  <div className="flex gap-2">
                    <Input
                      value={company?.name || ''}
                      onChange={(e) => setCompany({ ...company, name: e.target.value })}
                      disabled={user?.role !== 'User_elektra'}
                    />
                    {user?.role === 'User_elektra' && (
                      <Button onClick={handleUpdateCompanyName}>Salvar</Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2 mt-6">
                  <Label>Logo da Empresa</Label>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <Input
                      type="file"
                      accept="image/*"
                      className="flex-1"
                      onChange={async (e) => {
                        if (!e.target.files || !e.target.files[0] || !company) return
                        try {
                          const formData = new FormData()
                          formData.append('logo', e.target.files[0])
                          const updated = await pb
                            .collection('companies')
                            .update(company.id, formData)
                          setCompany(updated)
                          toast({ title: 'Sucesso', description: 'Logo atualizada com sucesso!' })
                        } catch (err: any) {
                          toast({
                            variant: 'destructive',
                            title: 'Erro',
                            description: 'Falha ao fazer upload da logo.',
                          })
                        }
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
                            try {
                              const updated = await pb
                                .collection('companies')
                                .update(company.id, { logo: null })
                              setCompany(updated)
                              toast({ title: 'Sucesso', description: 'Logo removida.' })
                            } catch (e) {
                              toast({
                                variant: 'destructive',
                                title: 'Erro',
                                description: 'Falha ao remover.',
                              })
                            }
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-6 border-t pt-6">
                  <Label>Status da Assinatura</Label>
                  <div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        company?.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {company?.status === 'active' ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    A gestão de equipe, plano e status da assinatura é feita diretamente pelo
                    Elektra Hub.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
