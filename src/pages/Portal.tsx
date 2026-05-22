import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function Portal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resending, setResending] = useState(false)

  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [sysSettings, setSysSettings] = useState<any>(null)

  useEffect(() => {
    pb.collection('system_settings')
      .getFirstListItem('')
      .then((res) => {
        setSysSettings(res)
      })
      .catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNeedsVerification(false)

    try {
      const res = await login(email, password)

      if (res.success) {
        navigate('/dashboard')
      } else {
        if (res.needsVerification) {
          setNeedsVerification(true)
        }
        toast({
          variant: 'destructive',
          title: 'Acesso Negado',
          description: res.error,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendVerification = async () => {
    setResending(true)
    try {
      await pb.send('/backend/v1/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({ email, origin: window.location.origin }),
        headers: { 'Content-Type': 'application/json' },
      })
      toast({
        title: 'E-mail enviado',
        description: 'Um novo link de verificação foi enviado para o seu e-mail.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao reenviar',
        description: err.response?.message || 'Tente novamente mais tarde.',
      })
    } finally {
      setResending(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email necessário',
        description: 'Preencha o campo de email para solicitar a recuperação.',
      })
      return
    }

    setLoading(true)
    try {
      await pb.send('/backend/v1/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email, origin: window.location.origin }),
        headers: { 'Content-Type': 'application/json' },
      })
      toast({
        title: 'Email enviado',
        description: 'Se sua conta estiver habilitada, um link de recuperação foi enviado.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Ação Bloqueada',
        description: err.response?.message || 'Não foi possível solicitar a recuperação de senha.',
      })
    } finally {
      setLoading(false)
    }
  }

  const bgUrl = sysSettings?.login_background
    ? pb.files.getURL(sysSettings, sysSettings.login_background)
    : 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2072&auto=format&fit=crop'

  const logoUrl = sysSettings?.hub_logo ? pb.files.getURL(sysSettings, sysSettings.hub_logo) : null

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <div className="hidden md:flex md:w-1/2 relative">
        <div className="absolute inset-0 bg-black/30 z-10" />
        <img src={bgUrl} alt="Login Background" className="w-full h-full object-cover" />
        <div className="absolute bottom-12 left-12 z-20 text-white max-w-lg">
          <h2 className="text-4xl font-bold mb-4 tracking-tight">
            {sysSettings?.system_name || 'Elektra CRM'}
          </h2>
          <p className="text-white/90 text-lg">
            {sysSettings?.hub_description ||
              'Plataforma inteligente para gestão de vendas de energia solar.'}
          </p>
        </div>
      </div>

      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8 lg:p-24 relative bg-background">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-14 object-contain mb-4" />
            ) : (
              <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary font-bold text-2xl">
                E
              </div>
            )}
            <h1 className="text-3xl font-bold tracking-tight">Bem-vindo(a) de volta</h1>
            <p className="text-muted-foreground">Acesse sua conta para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email corporativo</Label>
              <Input
                id="email"
                type="email"
                placeholder="nome@empresa.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Entrar no sistema
            </Button>

            {needsVerification && (
              <div className="pt-4 flex flex-col items-center gap-3">
                <p className="text-sm text-center text-amber-600 font-medium bg-amber-50 p-3 rounded-lg w-full">
                  Seu e-mail ainda não foi verificado.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResendVerification}
                  disabled={resending}
                >
                  {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Reenviar link de verificação
                </Button>
              </div>
            )}
          </form>
        </div>

        <div className="absolute bottom-8 right-8 text-xs text-muted-foreground/80 font-medium">
          {sysSettings?.support_info ? (
            <p>Suporte Elektra HUB/CRM: {sysSettings.support_info}</p>
          ) : (
            <p>Suporte Elektra HUB/CRM: suporte@elektrasolucoes.tech</p>
          )}
        </div>
      </div>
    </div>
  )
}
