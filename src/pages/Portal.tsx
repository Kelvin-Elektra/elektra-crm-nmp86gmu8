import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Loader2, Zap } from 'lucide-react'

export default function Portal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [forgotPassword, setForgotPassword] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNeedsSetup(false)

    const result = await login(email, password)

    if (result.success) {
      navigate('/dashboard')
    } else if (result.needsPasswordSetup) {
      setNeedsSetup(true)
    }
    setLoading(false)
  }

  const handleResendSetup = async () => {
    try {
      await pb.collection('users').requestPasswordReset(email)
      toast({
        title: 'Link enviado!',
        description: 'Um novo link de criação de senha foi enviado para seu e-mail.',
      })
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao enviar o link.',
        variant: 'destructive',
      })
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await pb.collection('users').requestPasswordReset(email)
      toast({
        title: 'E-mail enviado',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      })
      setForgotPassword(false)
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a solicitação.',
        variant: 'destructive',
      })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 bg-primary rounded-xl flex items-center justify-center shadow-inner">
              <Zap className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Elektra CRM</CardTitle>
          <CardDescription className="text-center">
            {forgotPassword ? 'Recuperação de senha' : 'Faça login para acessar sua conta'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {forgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">E-mail</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="Seu e-mail cadastrado"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar link de recuperação
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setForgotPassword(false)}
                  disabled={loading}
                >
                  Voltar para o login
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@empresa.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-xs font-normal text-muted-foreground hover:text-primary"
                    onClick={() => setForgotPassword(true)}
                  >
                    Esqueci minha senha
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              {needsSetup && (
                <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-md p-4 mt-4 animate-in fade-in slide-in-from-top-2">
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                    Você precisa cadastrar uma senha. Um link foi enviado para seu e-mail.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900"
                    onClick={handleResendSetup}
                  >
                    Enviar link novamente
                  </Button>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full mt-6">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
