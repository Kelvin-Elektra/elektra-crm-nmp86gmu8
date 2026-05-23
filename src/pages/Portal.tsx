import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export default function Portal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [needsVerification, setNeedsVerification] = useState(false)
  const { login, checkEmail, resendVerification } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [sysSettings, setSysSettings] = useState<any>(null)

  useEffect(() => {
    pb.collection('system_settings')
      .getFullList()
      .then((res) => {
        if (res.length > 0) setSysSettings(res[0])
      })
      .catch(() => {})
  }, [])

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await checkEmail(email)
      if (res.success) {
        setStep(2)
      } else {
        toast({ variant: 'destructive', title: 'Acesso Restrito', description: res.error })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
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
        toast({ variant: 'destructive', title: 'Falha no Login', description: res.error })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setLoading(true)
    const res = await resendVerification(email)
    if (res.success) {
      toast({ title: 'E-mail enviado', description: 'Verifique sua caixa de entrada.' })
    } else {
      toast({ variant: 'destructive', title: 'Erro', description: res.error })
    }
    setLoading(false)
  }

  const bgUrl = sysSettings?.login_background
    ? pb.files.getURL(sysSettings, sysSettings.login_background)
    : 'https://img.usecurling.com/p/1200/800?q=solar%20panel'

  const logoUrl = sysSettings?.hub_logo ? pb.files.getURL(sysSettings, sysSettings.hub_logo) : null

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div
        className="hidden lg:flex w-2/3 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${bgUrl})` }}
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="w-full lg:w-1/3 flex items-center justify-center p-8 bg-white/95 backdrop-blur-[2px] shadow-2xl z-10 relative border-l border-border/50">
        <Card className="w-full max-w-md shadow-none border-none bg-transparent">
          <CardHeader className="space-y-6 text-center">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-14 mx-auto object-contain" />
            ) : (
              <div className="h-14 w-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto">
                <span className="text-xl font-bold text-primary">Elektra</span>
              </div>
            )}

            <div className="space-y-1">
              <CardTitle className="text-2xl font-semibold tracking-tight">Bem-vindo(a)</CardTitle>
              <CardDescription className="text-base">
                {step === 1 ? 'Insira seu e-mail para continuar' : 'Insira sua senha para acessar'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleNext} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="E-mail"
                    className="h-12"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
                  Avançar {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-sm text-muted-foreground">{email}</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-sm text-primary font-medium hover:underline"
                    >
                      Alterar
                    </button>
                  </div>
                  <Input
                    type="password"
                    placeholder="Senha"
                    className="h-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {needsVerification && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-lg flex flex-col gap-3">
                    <p className="text-sm text-amber-800 font-medium">
                      Sua conta ainda não foi verificada.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full bg-white hover:bg-amber-50 text-amber-900 border-amber-300"
                      onClick={handleResend}
                      disabled={loading}
                    >
                      Reenviar link de autenticação
                    </Button>
                  </div>
                )}

                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Entrar
                </Button>

                <div className="text-center pt-2">
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={() => navigate('/reset-password')}
                  >
                    Esqueci minha senha
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
