import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Portal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [settings, setSettings] = useState<any>(null)
  const { login, checkEmail } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await pb.collection('system_settings').getFirstListItem('')
        setSettings(res)
      } catch (err) {
        try {
          const hookRes = await pb.send('/backend/v1/public/system-settings', { method: 'GET' })
          setSettings(hookRes)
        } catch (e) {
          console.error('Failed to load system settings', e)
        }
      }
    }
    fetchSettings()
  }, [])

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!email) {
      setErrorMsg('Por favor, informe seu e-mail.')
      return
    }
    setLoading(true)
    const res = await checkEmail(email)
    setLoading(false)
    if (res.success) {
      setStep(2)
    } else {
      setErrorMsg(res.error || 'Erro ao verificar e-mail.')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    if (!password) {
      setErrorMsg('Por favor, informe sua senha.')
      return
    }
    setLoading(true)
    const res = await login(email, password)
    setLoading(false)
    if (res.success) {
      navigate('/dashboard')
    } else {
      setErrorMsg(res.error || 'Credenciais inválidas.')
    }
  }

  const bgUrl = settings?.login_background
    ? pb.files.getURL(settings, settings.login_background)
    : 'https://img.usecurling.com/p/1920/1080?q=solar%20panels&color=black'

  const logoUrl = settings?.logo ? pb.files.getURL(settings, settings.logo) : null

  return (
    <div className="min-h-screen w-full flex relative overflow-hidden bg-slate-950">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />

      <div className="hidden md:block md:w-1/2 relative z-10" />

      <div className="w-full md:w-1/2 relative z-10 flex flex-col items-center justify-center p-6 md:p-12 bg-slate-900/40 backdrop-blur-xl border-l border-white/10 shadow-2xl">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 flex flex-col space-y-6 animate-fade-in-up duration-500">
          <div className="flex justify-center mb-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo Elektra" className="h-14 object-contain" />
            ) : (
              <div className="h-14 w-32 bg-slate-100 flex items-center justify-center rounded text-xs text-slate-400">
                Logo
              </div>
            )}
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {step === 1 ? 'Bem-vindo de volta' : 'Digite sua senha'}
            </h1>
            <p className="text-sm text-slate-500">
              {step === 1
                ? 'Insira seu e-mail para acessar o CRM'
                : 'Insira a senha da sua conta para continuar'}
            </p>
          </div>

          {errorMsg && (
            <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="ml-2 font-medium">{errorMsg}</AlertDescription>
            </Alert>
          )}

          {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="bg-slate-50 border-slate-200 focus-visible:ring-blue-600"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Avançar'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700">
                    Senha
                  </Label>
                  <Link
                    to="/reset-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
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
                  disabled={loading}
                  className="bg-slate-50 border-slate-200 focus-visible:ring-blue-600"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="px-3 border-slate-200 text-slate-600 hover:bg-slate-100"
                  onClick={() => {
                    setStep(1)
                    setErrorMsg('')
                  }}
                  disabled={loading}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar'}
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="mt-12 text-center text-sm font-medium text-white/90 drop-shadow-md">
          <p>Suporte Elektra HUB/CRM: {settings?.support_info || '46999999'}</p>
        </div>
      </div>
    </div>
  )
}
