import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, MailCheck, ArrowLeft, Sun } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

export default function Portal() {
  const { login, requestPasswordReset } = useAuth()
  const [view, setView] = useState<'login' | 'forgot' | 'sent'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [settings, setSettings] = useState<{
    logoUrl?: string
    login_backgroundUrl?: string
    system_name?: string
  }>({})

  useEffect(() => {
    pb.send('/backend/v1/public/system-settings', {})
      .then((res) => {
        setSettings(res)
      })
      .catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors: { email?: string; password?: string } = {}
    if (!email) errors.email = 'O e-mail é obrigatório.'
    if (!password) errors.password = 'A senha é obrigatória.'

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result.needsPasswordSetup) {
        setView('sent')
      } else if (!result.success) {
        setError(result.error || 'Credenciais inválidas. Verifique seu e-mail e senha.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!email) {
      setFieldErrors({ email: 'O e-mail é obrigatório.' })
      return
    }

    setFieldErrors({})
    setError('')
    setLoading(true)
    try {
      const success = await requestPasswordReset(email)
      if (success) {
        setView('sent')
      } else {
        setError('Não foi possível enviar o link. Verifique o e-mail.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-white">
      {/* Left side: Image */}
      <div className="hidden lg:flex w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        {settings.login_backgroundUrl ? (
          <img
            src={settings.login_backgroundUrl}
            alt="Background"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        ) : (
          <img
            src="https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2072&auto=format&fit=crop"
            alt="Painéis Solares"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        )}
        <div className="relative z-10 text-white text-center p-8 max-w-xl">
          {!settings.login_backgroundUrl && (
            <>
              <div className="mb-6 flex justify-center">
                <Sun className="h-16 w-16 text-yellow-400" />
              </div>
              <h1 className="text-4xl font-bold mb-4 animate-fade-in-up">
                Bem-vindo ao {settings.system_name || 'Elektra CRM'}
              </h1>
              <p
                className="text-lg text-slate-200 animate-fade-in-up"
                style={{ animationDelay: '100ms' }}
              >
                A plataforma completa para gestão de vendas e propostas de energia solar.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="max-w-md w-full">
          <div className="mb-8 flex justify-center items-center min-h-16">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-16 object-contain" />
            ) : (
              <Sun className="h-12 w-12 text-blue-600 lg:hidden" />
            )}
          </div>

          {view === 'login' && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-center mb-6">Acesso ao Sistema</h2>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleLogin} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined })
                    }}
                    placeholder="seu@email.com"
                    className={fieldErrors.email ? 'border-red-500' : ''}
                  />
                  {fieldErrors.email && <p className="text-sm text-red-500">{fieldErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setView('forgot')
                        setFieldErrors({})
                        setError('')
                      }}
                      className="text-sm text-blue-600 hover:underline focus:outline-none"
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (fieldErrors.password)
                        setFieldErrors({ ...fieldErrors, password: undefined })
                    }}
                    placeholder="••••••••"
                    className={fieldErrors.password ? 'border-red-500' : ''}
                  />
                  {fieldErrors.password && (
                    <p className="text-sm text-red-500">{fieldErrors.password}</p>
                  )}
                </div>
                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Entrar
                </Button>
              </form>
            </div>
          )}

          {view === 'forgot' && (
            <div className="animate-fade-in">
              <button
                type="button"
                onClick={() => {
                  setView('login')
                  setFieldErrors({})
                  setError('')
                }}
                className="flex items-center text-sm text-slate-500 hover:text-slate-900 mb-6 focus:outline-none"
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </button>
              <h2 className="text-2xl font-bold text-center mb-2">Recuperar Senha</h2>
              <p className="text-center text-slate-500 mb-6 text-sm">
                Informe seu e-mail para receber um link de redefinição.
              </p>
              {error && (
                <Alert variant="destructive" className="mb-6">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleReset} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-mail</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined })
                    }}
                    placeholder="seu@email.com"
                    className={fieldErrors.email ? 'border-red-500' : ''}
                  />
                  {fieldErrors.email && <p className="text-sm text-red-500">{fieldErrors.email}</p>}
                </div>
                <Button type="submit" className="w-full mt-2" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar link de recuperação
                </Button>
              </form>
            </div>
          )}

          {view === 'sent' && (
            <div className="animate-fade-in text-center">
              <div className="flex justify-center mb-6">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <MailCheck className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Verifique seu E-mail</h2>
              <p className="text-slate-500 mb-8">
                Um link de configuração de senha foi enviado para <strong>{email}</strong>. Por
                favor, verifique sua caixa de entrada e pasta de spam.
              </p>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleReset()}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar link novamente
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setView('login')
                    setPassword('')
                  }}
                >
                  Já configurei minha senha
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
