import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function Portal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'email' | 'password' | 'first_access' | 'success_reset'>('email')
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<{
    logo: string | null
    bg: string | null
    systemName: string
  }>({
    logo: null,
    bg: null,
    systemName: 'Elektra CRM',
  })
  const [emailError, setEmailError] = useState('')

  const { login, requestPasswordReset } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await pb.send('/backend/v1/portal-settings', { method: 'GET' })
        const baseUrl = import.meta.env.VITE_POCKETBASE_URL
        setSettings({
          logo: res.logo ? `${baseUrl}${res.logo}` : null,
          bg: res.login_background ? `${baseUrl}${res.login_background}` : null,
          systemName: res.system_name || 'Elektra CRM',
        })
      } catch (err) {
        console.error('Failed to load portal settings', err)
      }
    }
    fetchSettings()
  }, [])

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setEmailError('')

    try {
      const res = await pb.send('/backend/v1/auth/check-email', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })

      if (!res.exists) {
        setEmailError(
          'Este e-mail não é válido. Por favor, utilize o mesmo e-mail usado para acessar o Elektra HUB.',
        )
      } else if (!res.verified) {
        setStep('first_access')
      } else {
        setStep('password')
      }
    } catch (err) {
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível verificar o e-mail no momento.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)

    const res = await login(email, password)
    setLoading(false)

    if (res.success) {
      navigate('/dashboard')
    } else {
      toast({
        title: 'Falha na autenticação',
        description: res.error || 'Credenciais inválidas.',
        variant: 'destructive',
      })
    }
  }

  const handleSendReset = async () => {
    setLoading(true)
    const success = await requestPasswordReset(email)
    setLoading(false)

    if (success) {
      setStep('success_reset')
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o e-mail de definição de senha.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Left Column - Image & Branding */}
      <div className="hidden md:flex md:w-1/2 relative items-center justify-center overflow-hidden bg-zinc-950">
        {settings.bg ? (
          <img
            src={settings.bg}
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 to-zinc-950" />
        )}
        <div className="relative z-10 p-12 text-center text-white max-w-xl mx-auto flex flex-col items-center">
          <ShieldCheck className="h-16 w-16 mb-6 text-blue-400 opacity-90" />
          <h2 className="text-4xl font-bold mb-4 tracking-tight shadow-sm">
            {settings.systemName}
          </h2>
          <p className="text-lg opacity-80 font-medium">
            Gestão de vendas simplificada e integrada com o Hub de soluções.
          </p>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo Area */}
          <div className="flex flex-col items-center justify-center mb-8 space-y-4">
            {settings.logo ? (
              <img
                src={settings.logo}
                alt="Logo da Empresa"
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div className="text-3xl font-bold tracking-tight text-foreground">
                {settings.systemName}
              </div>
            )}
          </div>

          {/* Step 1: Email Form */}
          {step === 'email' && (
            <form onSubmit={handleCheckEmail} className="space-y-6 animate-fade-in-up">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Acesse sua conta
                </h1>
                <p className="text-muted-foreground text-sm">
                  Utilize as credenciais da sua plataforma de origem.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail corporativo</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.nome@empresa.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailError('')
                    }}
                    className={
                      emailError ? 'border-destructive focus-visible:ring-destructive' : ''
                    }
                    required
                    disabled={loading}
                    autoFocus
                  />
                  {emailError && (
                    <p className="text-sm font-medium text-destructive mt-1 animate-fade-in">
                      {emailError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={loading || !email}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  Continuar
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: Password Form */}
          {step === 'password' && (
            <form onSubmit={handleLogin} className="space-y-6 animate-fade-in-up">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Digite sua senha
                </h1>
                <div className="text-muted-foreground text-sm flex items-center justify-center gap-2">
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-primary hover:underline font-medium"
                    disabled={loading}
                  >
                    Alterar
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <Link
                      to="/reset-password"
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium"
                  disabled={loading || !password}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  Entrar
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: First Access Flow */}
          {step === 'first_access' && (
            <div className="space-y-6 animate-fade-in-up">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Acesso Inicial
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Identificamos que este é o seu primeiro acesso ao CRM. Para garantir sua
                  segurança, precisamos definir uma senha para sua conta.
                </p>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg flex items-center justify-center border border-border/50">
                <p className="font-medium text-foreground">{email}</p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleSendReset}
                  className="w-full h-11 text-base font-medium"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  Enviar link de definição
                </Button>
                <Button
                  variant="ghost"
                  className="w-full h-11"
                  onClick={() => setStep('email')}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Usar outro e-mail
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Success Message post-reset */}
          {step === 'success_reset' && (
            <div className="space-y-6 animate-fade-in-up text-center">
              <div className="flex justify-center mb-2">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  Link Enviado!
                </h1>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Enviamos as instruções para criação da sua senha de acesso para o e-mail:
                  <br />
                  <span className="font-medium text-foreground inline-block mt-2 px-3 py-1 bg-muted/50 rounded-md">
                    {email}
                  </span>
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full h-11 mt-6"
                onClick={() => {
                  setStep('email')
                  setEmail('')
                  setPassword('')
                }}
              >
                Voltar para o login
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
