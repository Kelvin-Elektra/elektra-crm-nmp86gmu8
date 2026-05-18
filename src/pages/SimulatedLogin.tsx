import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

interface DevUser {
  id: string
  name: string
  email: string
  role: string
  role_company: string
  company_id: string
}

export default function SimulatedLogin() {
  const [users, setUsers] = useState<DevUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const { loginWithSso, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (loginSuccess && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [loginSuccess, isAuthenticated, navigate])

  useEffect(() => {
    pb.send('/backend/v1/sso/dev-users', { method: 'GET' })
      .then((res) => {
        setUsers(res.users || [])
        setFetching(false)
      })
      .catch((err) => {
        console.error(err)
        toast({
          title: 'Erro ao carregar usuários',
          description: 'Não foi possível buscar a lista de usuários para simulação.',
          variant: 'destructive',
        })
        setFetching(false)
      })
  }, [toast])

  const handleLogin = async () => {
    if (!selectedUserId) {
      toast({ title: 'Aviso', description: 'Selecione um usuário primeiro.' })
      return
    }

    setLoading(true)
    try {
      const res = await pb.send('/backend/v1/sso/simulate', {
        method: 'POST',
        body: JSON.stringify({ user_id: selectedUserId }),
      })

      if (res.sso_token) {
        const loginRes = await loginWithSso(res.sso_token)
        if (loginRes.success) {
          toast({ title: 'Sucesso', description: 'Login simulado com sucesso!' })
          setLoginSuccess(true)
        } else {
          toast({
            title: 'Erro no Login',
            description: loginRes.diagnostic?.error || 'Falha ao autenticar.',
            variant: 'destructive',
          })
        }
      }
    } catch (err: any) {
      toast({
        title: 'Erro de Simulação',
        description: err.message || 'Falha ao gerar token de simulação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login Simulado (Dev)</CardTitle>
          <CardDescription>
            Ferramenta de diagnóstico para acessar rapidamente contas de usuários.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {fetching ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email} ({u.role_company || u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                className="w-full"
                onClick={handleLogin}
                disabled={!selectedUserId || loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simular Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
