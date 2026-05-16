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
import { LogOut, Play, ShieldCheck, Users, Building2, Terminal } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function ElektraAdminDashboard() {
  const { realUser, logout, simulateUser } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [companies, setCompanies] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all')
  const [logs, setLogs] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'companies' | 'logs'>('companies')

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
    } catch (err) {
      console.error(err)
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
        <div className="flex gap-4 border-b pb-4">
          <Button
            variant={activeTab === 'companies' ? 'default' : 'outline'}
            onClick={() => setActiveTab('companies')}
          >
            <Building2 className="h-4 w-4 mr-2" /> Empresas e Simulação
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
