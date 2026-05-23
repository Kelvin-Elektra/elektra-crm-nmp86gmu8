import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Portal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)
  const { login, resendVerification } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [systemLogo, setSystemLogo] = useState<string | null>(null)
  const [loginBg, setLoginBg] = useState<string | null>(null)

  useEffect(() => {
    pb.collection('system_settings')
      .getFirstListItem('')
      .then((settings) => {
        if (settings.logo) {
          setSystemLogo(pb.files.getURL(settings, settings.logo))
        }
        if (settings.login_background) {
          setLoginBg(pb.files.getURL(settings, settings.login_background))
        }
      })
      .catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNeedsVerification(false)

    const res = await login(email, password)
    setLoading(false)

    if (res.success) {
      navigate('/dashboard')
    } else {
      if (res.needsVerification) {
        setNeedsVerification(true)
      }
      toast({
        title: 'Erro no login',
        description: res.error,
        variant: 'destructive',
      })
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: 'E-mail obrigatório',
        description: 'Preencha o e-mail para reenviar o link de verificação.',
        variant: 'destructive',
      })
      return
    }

    setResending(true)
    const res = await resendVerification(email)
    setResending(false)

    if (res.success) {
      toast({
        title: 'Sucesso',
        description: 'Link de autenticação enviado com sucesso! Verifique sua caixa de entrada.',
      })
    } else {
      toast({
        title: 'Erro',
        description: res.error || 'Não foi possível enviar o link.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Continuous background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: loginBg
            ? `url(${loginBg})`
            : 'url("https://img.usecurling.com/p/1920/1080?q=solar%20panels&color=blue")',
        }}
      />

      {/* Left 50% - Normal/Transparent backdrop to keep background clear */}
      <div className="hidden lg:flex w-1/2 relative z-10 flex-col justify-between p-12 bg-black/20" />

      {/* Right 50% - Blurred backdrop for login quadrant */}
      <div className="w-full lg:w-1/2 relative z-10 flex items-center justify-center p-8 backdrop-blur-xl bg-white/10 dark:bg-black/40 border-l border-white/20 dark:border-black/20">
        <Card className="w-full max-w-md border-0 shadow-2xl bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm">
          <CardHeader className="space-y-4 flex flex-col items-center">
            {systemLogo ? (
              <img src={systemLogo} alt="Company Logo" className="h-20 object-contain" />
            ) : (
              <div className="h-20 w-20 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">CRM</span>
              </div>
            )}
            <div className="text-center space-y-1">
              <CardTitle className="text-2xl font-bold">Bem-vindo(a)</CardTitle>
              <CardDescription>Faça login para acessar o sistema</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Button
                    variant="link"
                    className="p-0 h-auto text-xs"
                    type="button"
                    onClick={() => navigate('/reset-password')}
                  >
                    Esqueceu a senha?
                  </Button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
              </Button>

              {needsVerification && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Sua conta ainda não foi verificada.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResendVerification}
                    disabled={resending}
                  >
                    {resending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Enviar link de autenticação novamente
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
