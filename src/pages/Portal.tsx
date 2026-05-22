import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowLeft, Loader2, Mail, Lock } from 'lucide-react'

export default function Portal() {
  const { login, requestPasswordReset } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    pb.collection('system_settings')
      .getFirstListItem('')
      .then(setSettings)
      .catch(() => {})
  }, [])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setError(null)
    setLoading(true)
    try {
      const res = await pb.send('/backend/v1/auth/check-email', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      if (res.exists) {
        setStep(2)
      } else {
        setError(
          'Usuário não cadastrado no sistema. Entre em contato com o Proprietário da sua companhia para liberar o acesso.',
        )
      }
    } catch (err: any) {
      setError('Erro ao verificar usuário. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setError(null)
    setLoading(true)
    try {
      const res = await login(email, password)
      if (res.success) {
        navigate('/dashboard')
      } else if (res.needsVerification) {
        setStep(3)
      } else {
        setError(res.error || 'Credenciais inválidas.')
      }
    } catch (err: any) {
      setError('Erro ao fazer login.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    setError(null)
    setSuccessMsg(null)
    setLoading(true)
    const res = await requestPasswordReset(email)
    if (res.success) {
      setSuccessMsg('E-mail de redefinição enviado com sucesso.')
    } else {
      setError(res.error)
    }
    setLoading(false)
  }

  const handleResendVerification = async () => {
    setError(null)
    setSuccessMsg(null)
    setLoading(true)
    try {
      await pb.send('/backend/v1/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({ email, origin: window.location.origin }),
      })
      setSuccessMsg('E-mail de verificação reenviado.')
    } catch (err: any) {
      setError(err.response?.message || 'Erro ao reenviar e-mail.')
    } finally {
      setLoading(false)
    }
  }

  const bgUrl = settings?.login_background
    ? pb.files.getURL(settings, settings.login_background)
    : ''
  const logoUrl =
    settings?.hub_logo || settings?.logo
      ? pb.files.getURL(settings, settings.hub_logo || settings.logo)
      : ''

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-slate-950 overflow-hidden">
      {/* Background with blur */}
      {bgUrl && (
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: `url(${bgUrl})`, filter: 'blur(12px)' }}
        />
      )}
      <div className="absolute inset-0 z-0 bg-black/50" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md px-4 animate-fade-in-up">
        <Card className="shadow-2xl border-none bg-white/95 backdrop-blur-md rounded-2xl">
          <CardHeader className="space-y-4 items-center pb-2 pt-8">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
            ) : (
              <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Lock className="h-8 w-8 text-slate-400" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-center text-slate-900 tracking-tight">
              Acesso ao Sistema
            </h1>
          </CardHeader>
          <CardContent className="space-y-6 pt-4 pb-8">
            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-100 font-medium">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 text-sm text-green-700 bg-green-50 rounded-lg border border-green-100 font-medium">
                {successMsg}
              </div>
            )}

            {step === 1 && (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700">
                    E-mail de acesso
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-9 bg-white border-slate-200"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full text-md h-11 rounded-lg" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Continuar'}
                </Button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div className="flex items-center gap-2 mb-4 bg-slate-100/80 border border-slate-200 p-2.5 rounded-lg">
                  <span className="text-sm font-medium flex-1 truncate text-slate-700 pl-1">
                    {email}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setStep(1)
                      setError(null)
                      setSuccessMsg(null)
                      setPassword('')
                    }}
                    className="h-8 px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    Alterar
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-slate-700">
                      Senha
                    </Label>
                    <Button
                      variant="link"
                      size="sm"
                      type="button"
                      onClick={handleResetPassword}
                      className="h-auto p-0 text-xs font-normal text-slate-500 hover:text-blue-600"
                      disabled={loading}
                    >
                      Esqueci minha senha
                    </Button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      className="pl-9 bg-white border-slate-200"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full text-md h-11 rounded-lg" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Entrar'}
                </Button>
              </form>
            )}

            {step === 3 && (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-amber-600" />
                </div>
                <p className="text-sm text-slate-600 font-medium">
                  Sua conta ainda não foi verificada. Enviamos um link de confirmação para o seu
                  e-mail.
                </p>
                <div className="space-y-3 pt-4">
                  <Button
                    onClick={handleResendVerification}
                    variant="outline"
                    className="w-full h-11 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Reenviar e-mail de confirmação
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep(1)
                      setError(null)
                      setSuccessMsg(null)
                    }}
                    className="w-full text-slate-500 hover:text-slate-700"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar ao início
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Support Info */}
      {settings?.support_info && (
        <div className="absolute bottom-6 right-6 text-white/90 text-sm font-medium drop-shadow-md z-10 hidden md:block">
          Suporte Elektra HUB/CRM: {settings.support_info}
        </div>
      )}
    </div>
  )
}
