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

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [requested, setRequested] = useState(false)

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await pb.send('/backend/v1/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email, origin: window.location.origin }),
        headers: { 'Content-Type': 'application/json' },
      })
      setRequested(true)
      toast({
        title: 'E-mail enviado',
        description:
          'Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha. Verifique sua caixa de entrada e também a pasta de spam.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.response?.message || 'Falha ao solicitar redefinição.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmReset = async (e: React.FormEvent) => {
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
      await pb.collection('users').confirmPasswordReset(token, password, confirmPassword)
      toast({
        title: 'Sucesso',
        description: 'Sua senha foi atualizada com sucesso. Você já pode fazer login.',
      })
      navigate('/')
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.response?.message || 'Falha ao redefinir senha. O link pode ter expirado.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader>
            <CardTitle>Recuperar Senha</CardTitle>
            <CardDescription>
              {requested
                ? 'Verifique sua caixa de entrada (e a pasta de spam) e siga as instruções.'
                : 'Insira seu e-mail e enviaremos um link para redefinir sua senha.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!requested ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Link
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/')}
                >
                  Voltar
                </Button>
              </form>
            ) : (
              <Button type="button" className="w-full" onClick={() => navigate('/')}>
                Voltar ao Início
              </Button>
            )}
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
          <form onSubmit={handleConfirmReset} className="space-y-5">
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
