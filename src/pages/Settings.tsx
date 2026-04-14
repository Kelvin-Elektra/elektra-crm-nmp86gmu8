import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('profile')
  const [companyUsers, setCompanyUsers] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)

  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'user' })

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)

  const loadUsers = async () => {
    if (user?.company_id) {
      try {
        const records = await pb.collection(Collections.USERS).getFullList({
          filter: `company_id = '${user.company_id}'`,
          sort: '-created',
        })
        setCompanyUsers(records)
      } catch (err) {
        console.error(err)
      }
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

  useEffect(() => {
    loadUsers()
    loadCompany()
  }, [user?.company_id])

  useRealtime(Collections.USERS, loadUsers)

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await pb.collection(Collections.COMPANIES).update(company.id, { domain: company.domain })
      toast({ title: 'Sucesso', description: 'Domínio atualizado com sucesso!' })
      loadCompany()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const email = `${newUser.username}@${company?.domain || 'dominio.com'}`
      await pb.collection(Collections.USERS).create({
        name: newUser.name,
        email,
        password: newUser.password,
        role: newUser.role,
        passwordConfirm: newUser.password,
        company_id: user?.company_id,
        status: 'active',
      })
      toast({ title: 'Sucesso', description: 'Usuário criado com sucesso!' })
      setIsUserModalOpen(false)
      setNewUser({ name: '', username: '', password: '', role: 'user' })
      loadUsers()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err.message || 'Erro ao criar usuário. Verifique se o email já existe.',
      })
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    try {
      await pb.collection(Collections.USERS).update(editUser.id, {
        name: editUser.name,
        role: editUser.role,
      })
      toast({ title: 'Sucesso', description: 'Usuário atualizado com sucesso!' })
      setIsEditModalOpen(false)
      setEditUser(null)
      loadUsers()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
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
  const canAddUser = companyUsers.length < maxUsers

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
              {user?.role === 'admin_company' && (
                <TabsTrigger
                  value="users"
                  className="w-full justify-start rounded-none border-l-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold transition-all hover:bg-muted/50"
                >
                  <Users className="mr-2 h-4 w-4" /> Equipe e Plano
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
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado por segurança.
                  </p>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2 opacity-50 pointer-events-none">
                  <Label htmlFor="current_password">Senha Atual</Label>
                  <Input id="current_password" type="password" />
                </div>
                <div className="grid grid-cols-2 gap-4 opacity-50 pointer-events-none">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">Nova Senha</Label>
                    <Input id="new_password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                    <Input id="confirm_password" type="password" />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button disabled>Salvar Alterações</Button>
                </div>
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
                  <Input value={company?.name || ''} disabled />
                </div>
                <div className="space-y-2 mt-4">
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
                </div>
                {user?.role === 'admin_company' && (
                  <form onSubmit={handleUpdateCompany} className="space-y-2 mt-4">
                    <Label>Domínio da Empresa</Label>
                    <div className="flex gap-2">
                      <Input
                        value={company?.domain || ''}
                        onChange={(e) => setCompany({ ...company, domain: e.target.value })}
                        placeholder="exemplo.com"
                        required
                      />
                      <Button type="submit">Atualizar</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Este domínio será usado para criar os emails dos novos membros da equipe.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'users' && user?.role === 'admin_company' && (
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
                          <Label>Usuário</Label>
                          <div className="flex items-center">
                            <Input
                              required
                              value={newUser.username}
                              onChange={(e) =>
                                setNewUser({
                                  ...newUser,
                                  username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''),
                                })
                              }
                              className="rounded-r-none border-r-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                              placeholder="nome"
                            />
                            <div className="flex items-center px-3 border border-l-0 rounded-r-md bg-muted text-muted-foreground h-10 whitespace-nowrap">
                              @{company?.domain || 'dominio.com'}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Senha (mín. 8 caracteres)</Label>
                          <Input
                            type="password"
                            required
                            minLength={8}
                            value={newUser.password}
                            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          />
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
                              <SelectItem value="admin_company">Administrador (Empresa)</SelectItem>
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
                        <div className="text-xs bg-secondary px-2 py-1 rounded-md capitalize hidden md:block">
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
