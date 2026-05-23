import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Loader2, ArrowLeft, Send } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function Portal() {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const [settings, setSettings] = useState<any>(null)
  const [showSplash, setShowSplash] = useState(true)

  const { checkEmail, login, resendVerification } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    pb.collection('system_settings')
      .getFirstListItem('')
      .then((res) => {
        setSettings(res)
      })
      .catch(() => {})

    const timer = setTimeout(() => setShowSplash(false), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    const res = await checkEmail(email)
    setLoading(false)
    if (res.success) {
      setStep(2)
    } else {
      toast({ title: 'Aviso', description: res.error, variant: 'destructive' })
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await login(email, password)
    setLoading(false)
    if (res.success) {
      navigate('/dashboard')
    } else if (res.needsVerification) {
      setNeedsVerification(true)
    } else {
      toast({ title: 'Erro', description: res.error, variant: 'destructive' })
    }
  }

  const handleResend = async () => {
    setLoading(true)
    const res = await resendVerification(email)
    setLoading(false)
    if (res.success) {
      toast({
        title: 'Sucesso',
        description: 'O link de verificação foi enviado para o seu e-mail.',
      })
    }
  }

  if (showSplash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        {settings?.hub_logo ? (
          <img
            src={pb.files.getURL(settings, settings.hub_logo)}
            className="h-32 animate-fade-in object-contain"
            alt="Logo"
          />
        ) : (
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        )}
      </div>
    )
  }

  const bgUrl = settings?.login_background
    ? pb.files.getURL(settings, settings.login_background)
    : 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2072&auto=format&fit=crop'

  const rawWa = settings?.support_info || ''
  const waNumber = rawWa.replace(/\D/g, '') || '5511999999999'
  const waUrl = `https://wa.me/${waNumber}`

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-slate-900">
      <div className="absolute inset-0 z-0">
        <img src={bgUrl} className="w-full h-full object-cover opacity-80" alt="Background" />
      </div>

      <div className="absolute inset-0 lg:left-1/2 bg-black/40 lg:bg-black/20 backdrop-blur-md lg:backdrop-blur-sm z-0"></div>

      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#1ebe57] transition-all hover:scale-110 duration-300"
        title="Suporte via WhatsApp"
      >
        <svg
          viewBox="0 0 24 24"
          width="28"
          height="28"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </a>

      <div className="relative z-10 flex w-full">
        <div className="hidden lg:flex w-1/2 items-center justify-center p-12"></div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
          <Card className="w-full max-w-md shadow-2xl bg-white/95 backdrop-blur-md border-0 ring-1 ring-black/5">
            <CardHeader className="space-y-4 pb-6">
              {settings?.hub_logo && (
                <div className="flex justify-center mb-2">
                  <img
                    src={pb.files.getURL(settings, settings.hub_logo)}
                    alt="Logo"
                    className="h-16 object-contain"
                  />
                </div>
              )}
              <div className="space-y-1.5 text-center">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Bem-vindo(a)
                </CardTitle>
                <CardDescription className="text-base">
                  {needsVerification
                    ? 'Verificação necessária'
                    : step === 1
                      ? 'Insira seu e-mail para continuar'
                      : 'Insira sua senha'}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {needsVerification ? (
                <div className="space-y-6 text-center animate-fade-in-up">
                  <p className="text-amber-600 font-medium">Sua conta ainda não foi verificada.</p>
                  <p className="text-sm text-slate-600">
                    Enviamos um link de verificação para o seu e-mail. Por favor, verifique sua
                    caixa de entrada e spam.
                  </p>
                  <div className="space-y-3 pt-2">
                    <Button className="w-full h-11" onClick={handleResend} disabled={loading}>
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Reenviar link de verificação
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => {
                        setNeedsVerification(false)
                        setStep(1)
                      }}
                    >
                      Voltar ao login
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={step === 1 ? handleNext : handleLogin} className="space-y-5">
                  {step === 1 && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="email" className="text-slate-700">
                        E-mail
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="seu-email@exemplo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-11"
                        autoFocus
                      />
                    </div>
                  )}
                  {step === 2 && (
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="password" className="text-slate-700">
                        Senha
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-11"
                        autoFocus
                      />
                    </div>
                  )}
                  <div className="pt-2">
                    {step === 1 ? (
                      <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Continuar
                      </Button>
                    ) : (
                      <div className="space-y-4 animate-fade-in">
                        <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Entrar
                        </Button>
                        <div className="flex items-center justify-between">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep(1)}
                            className="text-slate-500 hover:text-slate-700 -ml-2"
                          >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                          </Button>
                          <Link
                            to="/reset-password"
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Esqueceu a senha?
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
