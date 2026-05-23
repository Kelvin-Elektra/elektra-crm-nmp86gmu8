import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Portal() {
  const navigate = useNavigate()
  const { checkEmail, login } = useAuth()
  const { toast } = useToast()

  const [bootState, setBootState] = useState<'booting' | 'fading' | 'ready'>('booting')
  const [settings, setSettings] = useState<{
    logoUrl: string
    bgUrl: string
    supportPhone: string
    systemName: string
  } | null>(null)

  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    const boot = async () => {
      const startTime = Date.now()
      let logoUrl = ''
      let bgUrl = ''
      let supportPhone = ''
      let systemName = 'Elektra CRM'

      try {
        const record = await pb
          .collection('system_settings')
          .getFirstListItem('')
          .catch(() => null)
        if (record) {
          logoUrl = record.logo ? pb.files.getURL(record, record.logo) : ''
          bgUrl = record.login_background ? pb.files.getURL(record, record.login_background) : ''
          supportPhone = record.support_info || ''
          systemName = record.system_name || 'Elektra CRM'
        }
      } catch (err) {
        console.error('Failed to fetch system settings', err)
      }

      if (isMounted) {
        setSettings({ logoUrl, bgUrl, supportPhone, systemName })
      }

      const promises: Promise<void>[] = []

      if (bgUrl) {
        promises.push(
          new Promise((resolve) => {
            const img = new Image()
            img.onload = resolve as any
            img.onerror = resolve as any
            img.src = bgUrl
          }),
        )
      }

      if (logoUrl) {
        promises.push(
          new Promise((resolve) => {
            const img = new Image()
            img.onload = resolve as any
            img.onerror = resolve as any
            img.src = logoUrl
          }),
        )
      }

      await Promise.all(promises)

      const elapsed = Date.now() - startTime
      if (elapsed < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed))
      }

      if (!isMounted) return

      setBootState('fading')
      setTimeout(() => {
        if (isMounted) setBootState('ready')
      }, 700)
    }

    boot()

    return () => {
      isMounted = false
    }
  }, [])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    const res = await checkEmail(email)
    setIsLoading(false)

    if (res.success) {
      setStep(2)
    } else {
      toast({
        title: 'Acesso negado',
        description: res.error,
        variant: 'destructive',
      })
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return

    setIsLoading(true)
    const res = await login(email, password)
    setIsLoading(false)

    if (res.success) {
      // AuthContext and App.tsx will handle the redirect to /dashboard automatically
    } else {
      toast({
        title: 'Erro de Autenticação',
        description: res.error,
        variant: 'destructive',
      })
      if (res.needsVerification) {
        navigate('/verify', { state: { email } })
      }
    }
  }

  let phoneDigits = settings?.supportPhone?.replace(/\D/g, '') || ''
  if (phoneDigits && !phoneDigits.startsWith('55')) {
    phoneDigits = '55' + phoneDigits
  }
  const whatsappLink = phoneDigits ? `https://wa.me/${phoneDigits}` : ''

  return (
    <>
      {/* Splash Screen */}
      {bootState !== 'ready' && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-50 transition-opacity duration-700 ${
            bootState === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="h-20 object-contain animate-pulse" />
          ) : (
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          )}
        </div>
      )}

      {/* Main Login View */}
      <div className="flex min-h-screen w-full bg-zinc-50 overflow-hidden">
        {/* Left Side - Brand area */}
        <div className="hidden md:flex flex-col w-1/2 items-center justify-center bg-white p-8 border-r border-zinc-200">
          {settings?.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="max-w-[60%] max-h-32 object-contain hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <h1 className="text-4xl font-bold text-zinc-800 tracking-tight">
              {settings?.systemName}
            </h1>
          )}
        </div>

        {/* Right Side - Form area */}
        <div className="relative flex-col w-full md:w-1/2 flex items-center justify-center p-4">
          {/* Background Image & Overlay */}
          {settings?.bgUrl && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-1000"
              style={{ backgroundImage: `url(${settings.bgUrl})` }}
            />
          )}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[8px]" />

          {/* Login Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full z-10 relative animate-fade-in-up border border-zinc-100">
            {/* Mobile Logo */}
            <div className="md:hidden flex justify-center mb-6">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="Logo" className="h-16 object-contain" />
              ) : (
                <h1 className="text-2xl font-bold text-zinc-800">{settings?.systemName}</h1>
              )}
            </div>

            {/* Form Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-zinc-900">Bem-vindo</h2>
              <p className="text-sm text-zinc-500 mt-2">
                {step === 1 ? 'Insira seu e-mail para continuar' : 'Insira sua senha para acessar'}
              </p>
            </div>

            {/* Forms */}
            <form
              onSubmit={step === 1 ? handleEmailSubmit : handlePasswordSubmit}
              className="space-y-5"
            >
              {step === 1 ? (
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-700">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-zinc-50 border-zinc-200 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                  />
                </div>
              ) : (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="password" className="text-zinc-700">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-zinc-50 border-zinc-200 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                    autoFocus
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full font-medium h-11 transition-all duration-200 hover:shadow-md"
                disabled={isLoading || (step === 1 ? !email : !password)}
              >
                {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                {step === 1 ? 'Continuar' : 'Entrar'}
              </Button>
            </form>

            {/* Form Footer / Navigation */}
            {step === 2 && (
              <div className="flex flex-col space-y-3 mt-6 pt-6 border-t border-zinc-100">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-zinc-500 hover:text-zinc-900 transition-colors h-10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate('/reset-password')}
                  className="text-xs text-primary hover:text-primary/80"
                >
                  Esqueceu sua senha?
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      {whatsappLink && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-[#128C7E] hover:-translate-y-1 hover:shadow-[0_12px_35px_rgb(0,0,0,0.2)] transition-all duration-300 group"
          aria-label="Falar com o suporte"
        >
          <MessageCircle className="w-6 h-6" />
        </a>
      )}
    </>
  )
}
