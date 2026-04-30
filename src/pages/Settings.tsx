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
  const [companyUsers, setCompanyUsers] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  const [systemSettings, setSystemSettings] = useState<any>(null)

  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    role: 'user',
  })

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)

  const [profilePassword, setProfilePassword] = useState({
    oldPassword: '',
    password: '',
    passwordConfirm: '',
  })

  const loadUsers = async () => {
    try {
      const filter = user?.role === 'admin_elektra' ? '' : `company_id = '${user?.company_id}'`
      if (!filter && !user?.company_id && user?.role !== 'admin_elektra') return

      const records = await pb.collection(Collections.USERS).getFullList({
        filter,
        sort: '-created',
      })
      setCompanyUsers(records)
    } catch (err) {
      console.error(err)
    }
  }

  const loadCompany = async () => {
    if (user?.company_id) {
      try {
        const record = await pb.collection(Collections.COMPANIES).getOne(user.company_id)
        setCompany(record)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const loadSystemSettings = async () => {
    if (user?.role === 'admin_elektra') {
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
    loadUsers()
    loadCompany()
    loadSystemSettings()
  }, [user?.company_id, user?.role])

  useRealtime(Collections.USERS, loadUsers)

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

  const handleUpdateCompanyStatus = async (status: string) => {
    try {
      const formData = new FormData()
      formData.append('status', status)
      await pb.collection(Collections.COMPANIES).update(company.id, formData)
      setCompany({ ...company, status })
      toast({ title: 'Sucesso', description: 'Status atualizado com sucesso!' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newUser.password !== newUser.passwordConfirm) {
      toast({
        variant: 'destructive',
        title: 'Erro de validação',
        description: 'As senhas não coincidem.',
      })
      return
    }

    try {
      await pb.send('/backend/v1/users/admin-create', {
        method: 'POST',
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          company_id: user?.company_id,
        }),
        headers: { 'Content-Type': 'application/json' },
      })

      toast({
        title: 'Sucesso',
        description: 'Usuário criado com sucesso! Credenciais enviadas por email.',
      })
      setIsUserModalOpen(false)
      setNewUser({ name: '', email: '', password: '', passwordConfirm: '', role: 'user' })
      loadUsers()
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      let errorMsg = err.message || 'Erro ao criar usuário. Verifique se o email já existe.'

      if (fieldErrors.email) {
        errorMsg = 'Por favor, insira um e-mail válido.'
      } else if (Object.keys(fieldErrors).length > 0) {
        errorMsg = Object.values(fieldErrors).join('. ')
      }

      toast({
        variant: 'destructive',
        title: 'Erro',
        description: errorMsg,
      })
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return

    if (editUser.password || editUser.passwordConfirm) {
      if (editUser.password !== editUser.passwordConfirm) {
        toast({
          variant: 'destructive',
          title: 'Erro de validação',
          description: 'As senhas não coincidem.',
        })
        return
      }
    }

    try {
      const data = {
        name: editUser.name,
        role: editUser.role,
        email: editUser.email,
        ...(editUser.password
          ? { password: editUser.password, passwordConfirm: editUser.passwordConfirm }
          : {}),
      }

      const originalUser = companyUsers.find((u) => u.id === editUser.id)
      const emailChanged = originalUser && originalUser.email !== editUser.email

      await pb.send(`/backend/v1/users/${editUser.id}/admin-update`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      })

      if (emailChanged) {
        try {
          await pb.collection(Collections.USERS).requestVerification(editUser.email)
        } catch (verifyErr) {
          console.error('Erro ao enviar email de verificação:', verifyErr)
        }
      }

      toast({ title: 'Sucesso', description: 'Usuário atualizado com sucesso!' })
      setIsEditModalOpen(false)
      setEditUser(null)
      loadUsers()
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)
      let errorMsg = err.message || 'Erro ao atualizar usuário.'

      if (Object.keys(fieldErrors).length > 0) {
        errorMsg = Object.values(fieldErrors).join('. ')
      }

      toast({ variant: 'destructive', title: 'Erro', description: errorMsg })
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este usuário permanentemente?')) return
    try {
      await pb.collection(Collections.USERS).delete(id)
      toast({ title: 'Sucesso', description: 'Usuário removido com sucesso.' })
      loadUsers()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    }
  }

  const maxUsers = company?.max_users || 5
  const canAddUser = user?.role === 'admin_elektra' || companyUsers.length < maxUsers

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
              {(user?.role === 'admin_company' || user?.role === 'admin_elektra') && (
                <TabsTrigger
                  value="users"
                  className="w-full justify-start rounded-none border-l-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/50"
                >
                  <Users className="mr-2 h-4 w-4" /> Equipe e Plano
                </TabsTrigger>
              )}
              {user?.role === 'admin_elektra' && (
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
          {activeTab === 'system' && user?.role === 'admin_elektra' && (
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
                      disabled={user?.role !== 'admin_elektra'}
                    />
                    {user?.role === 'admin_elektra' && (
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
                        if (!e.target.files || !e.target.files[0]) return
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
                  {user?.role === 'admin_elektra' ? (
                    <Select value={company?.status} onValueChange={handleUpdateCompanyStatus}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativa</SelectItem>
                        <SelectItem value="inactive">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
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
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'users' &&
            (user?.role === 'admin_company' || user?.role === 'admin_elektra') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Equipe e Plano</CardTitle>
                    <CardDescription>
                      Uso do plano: {companyUsers.length} de {maxUsers} usuários
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-block">
                              <DialogTrigger asChild>
                                <Button disabled={!canAddUser}>
                                  <Plus className="h-4 w-4 mr-2" /> Novo Usuário
                                </Button>
                              </DialogTrigger>
                            </div>
                          </TooltipTrigger>
                          {!canAddUser && (
                            <TooltipContent>
                              <p>Limite de {maxUsers} usuários atingido.</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Membro</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                              required
                              value={newUser.name}
                              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                              type="email"
                              required
                              value={newUser.email}
                              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                              placeholder="email@empresa.com"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Senha (mín. 8 caracteres)</Label>
                              <Input
                                type="password"
                                required
                                minLength={8}
                                value={newUser.password}
                                onChange={(e) =>
                                  setNewUser({ ...newUser, password: e.target.value })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Confirmar Senha</Label>
                              <Input
                                type="password"
                                required
                                minLength={8}
                                value={newUser.passwordConfirm}
                                onChange={(e) =>
                                  setNewUser({ ...newUser, passwordConfirm: e.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Permissão</Label>
                            <Select
                              value={newUser.role}
                              onValueChange={(v) => setNewUser({ ...newUser, role: v })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">Usuário Padrão</SelectItem>
                                <SelectItem value="admin_company">
                                  Administrador (Empresa)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="pt-4 flex justify-end">
                            <Button type="submit">Salvar</Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    {companyUsers.map((u, i) => (
                      <div
                        key={u.id}
                        className={`p-4 flex items-center justify-between ${
                          i !== companyUsers.length - 1 ? 'border-b' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium leading-none">{u.name || 'Sem nome'}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md capitalize hidden md:block">
                            {u.role.replace('_', ' ')}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditUser(u)
                                  setIsEditModalOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteUser(u.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Remover
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                    {companyUsers.length === 0 && (
                      <div className="p-4 text-center text-muted-foreground">
                        Nenhum usuário encontrado.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      </div>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Modifique os dados e permissões do membro.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  required
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nova Senha (opcional)</Label>
                  <Input
                    type="password"
                    minLength={8}
                    value={editUser.password || ''}
                    onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                    placeholder="Deixe em branco para manter"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar Nova Senha</Label>
                  <Input
                    type="password"
                    minLength={8}
                    value={editUser.passwordConfirm || ''}
                    onChange={(e) => setEditUser({ ...editUser, passwordConfirm: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Permissão</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(v) => setEditUser({ ...editUser, role: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário Padrão</SelectItem>
                    <SelectItem value="admin_company">Administrador (Empresa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-4 flex justify-end">
                <Button type="submit">Salvar Alterações</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
