import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { toast } = useToast()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      return toast({ title: 'Erro', description: 'As senhas não conferem', variant: 'destructive' })
    }
    if (password.length < 8) {
      return toast({
        title: 'Erro',
        description: 'A senha deve ter pelo menos 8 caracteres',
        variant: 'destructive',
      })
    }

    setLoading(true)
    try {
      await pb.send('/backend/v1/auth/confirm-reset', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
        headers: { 'Content-Type': 'application/json' },
      })
      toast({
        title: 'Sucesso',
        description: 'Sua senha foi configurada com sucesso. Você já pode fazer login.',
      })
      navigate('/')
    } catch (err: any) {
      toast({
        title: 'Erro',
        description:
          err.response?.message || 'Falha ao configurar senha. O link pode ter expirado.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Link Inválido</CardTitle>
            <CardDescription>
              O link de recuperação ou configuração não possui um token válido ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => navigate('/')}>
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="max-w-md w-full animate-fade-in-up shadow-lg">
        <CardHeader>
          <CardTitle>Configurar Nova Senha</CardTitle>
          <CardDescription>Crie uma senha forte e segura para acessar sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Senha</Label>
              <Input
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
