import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react'

export default function Portal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [settings, setSettings] = useState<any>(null)

  const { login, resendVerification } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    pb.collection('system_settings')
      .getFirstListItem('')
      .then(setSettings)
      .catch((err) => console.error('Erro ao carregar configurações:', err))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNeedsVerification(false)
    setResendSuccess(false)

    const result = await login(email, password)
    if (result.success) {
      navigate('/dashboard')
    } else {
      setError(result.error || 'Erro ao fazer login')
      if (result.needsVerification) {
        setNeedsVerification(true)
      }
    }
    setLoading(false)
  }

  const handleResend = async () => {
    setResendLoading(true)
    const result = await resendVerification(email)
    if (result.success) {
      setResendSuccess(true)
      setError('')
    } else {
      setError(result.error || 'Erro ao reenviar link')
    }
    setResendLoading(false)
  }

  const bgUrl = settings?.login_background
    ? pb.files.getURL(settings, settings.login_background)
    : 'https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1920&auto=format&fit=crop'

  const logoUrl = settings?.logo ? pb.files.getURL(settings, settings.logo) : null

  return (
    <div className="flex min-h-screen relative w-full overflow-hidden bg-slate-950">
      <img
        src={bgUrl}
        className="absolute inset-0 w-full h-full object-cover z-0"
        alt="Background"
      />

      <div className="absolute inset-0 bg-black/10 z-0"></div>

      <div className="flex-1 hidden lg:block relative z-10"></div>

      {/* Right quadrant with reduced blur and opacity (approx 30% intensity) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative z-10 backdrop-blur-sm bg-slate-950/40 shadow-2xl border-l border-white/5 min-h-screen overflow-y-auto">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center mb-8">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-20 object-contain drop-shadow-md" />
            ) : (
              <div className="h-16 text-white text-3xl font-bold flex items-center drop-shadow-md">
                {settings?.system_name || 'Elektra CRM'}
              </div>
            )}
          </div>

          <Card className="border border-white/10 shadow-2xl bg-slate-950/80 text-slate-100 backdrop-blur-md">
            <CardHeader className="space-y-2 text-center pb-6">
              <CardTitle className="text-2xl font-bold tracking-tight">Bem-vindo(a)</CardTitle>
              <CardDescription className="text-slate-300">
                Acesse sua conta para continuar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-200">
                    E-mail
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="seu@email.com"
                      className="pl-10 bg-slate-900/80 border-slate-700 text-slate-100 focus-visible:ring-blue-500 h-11 transition-colors"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-slate-200">
                      Senha
                    </Label>
                    <Link
                      to="/reset-password"
                      className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Esqueceu a senha?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      id="password"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="pl-10 bg-slate-900/80 border-slate-700 text-slate-100 focus-visible:ring-blue-500 h-11 transition-colors"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-950/50 border border-red-900/50 rounded-lg text-red-200 text-sm flex items-start gap-3 animate-in fade-in-up duration-300 shadow-inner">
                    <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="leading-relaxed">{error}</p>
                      {needsVerification && !resendSuccess && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3 bg-red-900/40 hover:bg-red-900/60 border-red-800 text-white w-full transition-all"
                          onClick={handleResend}
                          disabled={resendLoading}
                        >
                          {resendLoading ? 'Enviando...' : 'Reenviar link de confirmação'}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {resendSuccess && (
                  <div className="p-4 bg-green-950/50 border border-green-900/50 rounded-lg text-green-200 text-sm flex items-center gap-3 animate-in fade-in-up duration-300 shadow-inner">
                    <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
                    <p className="leading-relaxed">
                      Link de confirmação enviado! Verifique sua caixa de entrada.
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11 text-base font-medium transition-all duration-200 shadow-lg shadow-blue-900/20"
                  disabled={loading}
                >
                  {loading ? 'Entrando...' : 'Entrar no Sistema'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      {settings?.support_info && (
        <a
          href={`https://wa.me/55${settings.support_info.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 h-14 w-14 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 z-50 group"
          aria-label="Suporte via WhatsApp"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-current">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.482-1.459-1.655-1.757-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <span className="absolute right-16 bg-slate-800 border border-slate-700 text-slate-100 text-sm px-4 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl flex items-center gap-2">
            Precisa de ajuda?
          </span>
        </a>
      )}
    </div>
  )
}
