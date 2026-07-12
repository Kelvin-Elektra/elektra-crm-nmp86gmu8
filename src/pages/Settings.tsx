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
import { Building2, User, Users, Plus, KeyRound, Edit2, Trash2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

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

  const [team, setTeam] = useState<any[]>([])

  // Create / Reactivate State
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role_company: 'user',
  })

  // Edit State
  const [editUserOpen, setEditUserOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any>(null)

  const loadCompany = async () => {
    if (user?.company_id && user.company_id.trim() !== '') {
      try {
        const record = await pb.collection('companies').getOne(user.company_id)
        setCompany(record)
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

  const loadSystemSettings = async () => {
    if (user?.role === 'User_elektra') {
      try {
        const records = await pb.collection('system_settings').getFullList()
        if (records.length > 0) {
          setSystemSettings(records[0])
        }
      } catch {
        /* intentionally ignored */
      }
    }
  }

  const loadTeam = async () => {
    if ((user?.role === 'User_owner' || user?.role === 'User_elektra') && user?.company_id) {
      try {
        const records = await pb
          .collection('users')
          .getFullList({ filter: `company_id='${user.company_id}'`, sort: '-created' })
        setTeam(records)
      } catch {
        /* intentionally ignored */
      }
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

  const handleUpdateCompany = async () => {
    if (!company) return
    try {
      await pb.collection('companies').update(company.id, {
        name: company.name,
        cnpj: company.cnpj || '',
      })
      toast({ title: 'Dados da empresa atualizados!' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    }
  }

  const handleCreateUser = async () => {
    try {
      const activeUsers = team.filter((u) => u.status === 'active').length
      const maxUsers = company?.max_users || 5

      const existingUser = await pb
        .collection('users')
        .getFirstListItem(`email='${newUserForm.email}'`)
        .catch(() => null)

      if (existingUser) {
        if (existingUser.company_id !== user?.company_id) {
          throw new Error('E-mail já está em uso por outra empresa no sistema.')
        }
        if (existingUser.status === 'active') {
          throw new Error('Este usuário já está ativo na sua equipe.')
        }
        if (activeUsers >= maxUsers) {
          throw new Error(
            `Limite de usuários atingido (${maxUsers}). Mude de plano para adicionar mais.`,
          )
        }

        // Reactivate soft-deleted user
        await pb.collection('users').update(existingUser.id, {
          status: 'active',
          verified: false,
          role_company: newUserForm.role_company,
          name: newUserForm.name,
        })
        await pb.collection('users').requestVerification(newUserForm.email)
        toast({ title: 'Usuário reativado e e-mail de verificação enviado!' })
      } else {
        if (activeUsers >= maxUsers) {
          throw new Error(
            `Limite de usuários atingido (${maxUsers}). Mude de plano para adicionar mais.`,
          )
        }
        // Create new user
        await pb.collection('users').create({
          name: newUserForm.name,
          email: newUserForm.email,
          password: newUserForm.password,
          passwordConfirm: newUserForm.password,
          company_id: user?.company_id,
          role: 'User',
          role_company: newUserForm.role_company,
          status: 'active',
          verified: false,
        })
        await pb.collection('users').requestVerification(newUserForm.email)
        toast({
          title: 'Usuário criado com sucesso!',
          description: 'Um e-mail de verificação foi enviado.',
        })
      }
      setNewUserOpen(false)
      setNewUserForm({ name: '', email: '', password: '', role_company: 'user' })
      loadTeam()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar usuário',
        description: err.response?.message || err.message,
      })
    }
  }

  const handleUpdateUser = async () => {
    try {
      await pb.collection('users').update(editingUser.id, {
        name: editingUser.name,
        role_company: editingUser.role_company,
      })
      toast({ title: 'Usuário atualizado com sucesso!' })
      setEditUserOpen(false)
      setEditingUser(null)
      loadTeam()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja desativar este usuário? O acesso será revogado.')) return
    try {
      await pb.collection('users').update(userId, { status: 'inactive', verified: false })
      toast({ title: 'Usuário desativado.' })
      loadTeam()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao desativar', description: err.message })
    }
  }

  const handleAdminReset = async (email: string) => {
    try {
      await pb.collection('users').requestPasswordReset(email)
      toast({ title: 'Sucesso', description: 'E-mail de redefinição de senha enviado ao usuário.' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.response?.message })
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
              {isOwner && (
                <TabsTrigger
                  value="team"
                  className="w-full justify-start rounded-none border-l-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary transition-all hover:bg-muted/50"
                >
                  <Users className="mr-2 h-4 w-4" /> Equipe
                </TabsTrigger>
              )}
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
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input
                      value={company?.cnpj || ''}
                      onChange={(e) => setCompany({ ...company, cnpj: e.target.value })}
                      disabled={!isOwner}
                      placeholder="00.000.000/0000-00"
                    />
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>
                    Equipe
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (Ativos: {team.filter((u) => u.status === 'active').length} /{' '}
                      {company?.max_users || 5})
                    </span>
                  </CardTitle>
                  <CardDescription>Gerencie os usuários da sua empresa.</CardDescription>
                </div>
                <Button
                  onClick={() => setNewUserOpen(true)}
                  size="sm"
                  disabled={
                    team.filter((u) => u.status === 'active').length >= (company?.max_users || 5)
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Usuário
                </Button>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {team.map((member) => (
                        <TableRow
                          key={member.id}
                          className={member.status === 'inactive' ? 'opacity-50 bg-slate-50' : ''}
                        >
                          <TableCell className="font-medium">{member.name}</TableCell>
                          <TableCell>{member.email}</TableCell>
                          <TableCell>
                            {member.role_company === 'admin' ? (
                              <Badge
                                variant="outline"
                                className="bg-blue-50 text-blue-700 hover:bg-blue-50"
                              >
                                Administrador
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-slate-50 text-slate-700 hover:bg-slate-50"
                              >
                                Usuário
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {member.status === 'inactive' ? (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 hover:bg-red-50"
                              >
                                Inativo
                              </Badge>
                            ) : member.verified ? (
                              <Badge
                                variant="outline"
                                className="bg-green-50 text-green-700 hover:bg-green-50"
                              >
                                Verificado
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-amber-50 text-amber-700 hover:bg-amber-50"
                              >
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {member.status === 'active' && member.id !== user?.id && (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleAdminReset(member.email)}
                                  title="Enviar Redefinição de Senha"
                                >
                                  <KeyRound className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingUser(member)
                                    setEditUserOpen(true)
                                  }}
                                  title="Editar"
                                >
                                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteUser(member.id)}
                                  title="Desativar"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            )}
                            {member.id === user?.id && (
                              <span className="text-sm text-muted-foreground pr-4">Você</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {team.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                            Nenhum usuário encontrado.
                          </TableCell>
                        </TableRow>
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

      <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="seu-email@exemplo.com"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Senha Inicial</Label>
              <Input
                type="password"
                minLength={8}
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select
                value={newUserForm.role_company}
                onValueChange={(val) => setNewUserForm({ ...newUserForm, role_company: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário Padrão</SelectItem>
                  <SelectItem value="admin">Administrador da Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewUserOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Perfil de Acesso</Label>
                <Select
                  value={editingUser.role_company}
                  onValueChange={(val) => setEditingUser({ ...editingUser, role_company: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário Padrão</SelectItem>
                    <SelectItem value="admin">Administrador da Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
