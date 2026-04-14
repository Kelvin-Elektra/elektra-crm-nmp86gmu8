import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { Building2, User, Users, Plus } from 'lucide-react'
import { getUsers, getCompany, createUser } from '@/services/db'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Dialog,
  DialogContent,
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
import { useToast } from '@/hooks/use-toast'

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('profile')
  const [companyUsers, setCompanyUsers] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)

  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' })

  const loadUsers = async () => {
    if (user?.company_id) {
      const allUsers = await getUsers()
      setCompanyUsers(allUsers.filter((u: any) => u.company_id === user.company_id))
    }
  }

  const loadCompany = async () => {
    if (user?.company_id) {
      setCompany(await getCompany(user.company_id))
    }
  }

  useEffect(() => {
    loadUsers()
    loadCompany()
  }, [user?.company_id])

  useRealtime('users', loadUsers)

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createUser({
        ...newUser,
        passwordConfirm: newUser.password,
        company_id: user?.company_id,
      })
      toast({ title: 'Sucesso', description: 'Usuário criado com sucesso!' })
      setIsUserModalOpen(false)
      setNewUser({ name: '', email: '', password: '', role: 'user' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: err.message || 'Erro ao criar usuário',
      })
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
                className="w-full justify-start data-[state=active]:bg-secondary text-[#ffffff]"
              >
                <User className="mr-2 h-4 w-4" /> Meu Perfil
              </TabsTrigger>
              <TabsTrigger
                value="company"
                className="w-full justify-start data-[state=active]:bg-secondary text-[#ffffff]"
              >
                <Building2 className="mr-2 h-4 w-4" /> Dados da Empresa
              </TabsTrigger>
              {user?.role === 'admin_company' && (
                <TabsTrigger
                  value="users"
                  className="w-full justify-start data-[state=active]:bg-secondary text-[#ffffff]"
                >
                  <Users className="mr-2 h-4 w-4" /> Usuários e Plano
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
                  <Input id="name" defaultValue={user?.name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" defaultValue={user?.email} disabled />
                  <p className="text-xs text-muted-foreground">
                    O email não pode ser alterado por segurança.
                  </p>
                </div>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <Label htmlFor="current_password">Senha Atual</Label>
                  <Input id="current_password" type="password" />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                  <Button>Salvar Alterações</Button>
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
                <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!canAddUser}>
                      <Plus className="h-4 w-4 mr-2" /> Novo Usuário
                    </Button>
                  </DialogTrigger>
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
                        />
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
                        <p className="font-medium">{u.name || 'Sem nome'}</p>
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </div>
                      <div className="text-sm bg-secondary px-2 py-1 rounded-md capitalize">
                        {u.role.replace('_', ' ')}
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
    </div>
  )
}
