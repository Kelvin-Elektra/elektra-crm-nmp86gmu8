import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, MessageCircle, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'

export default function Portal() {
  const { checkEmail, login, resendVerification } = useAuth()
  const { toast } = useToast()

  const [settings, setSettings] = useState<any>(null)
  const [appReady, setAppReady] = useState(false)

  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)

  useEffect(() => {
    const init = async () => {
      const start = Date.now()
      try {
        const records = await pb.collection('system_settings').getFullList()
        if (records.length > 0) {
          setSettings(records[0])
        }
      } catch (e) {
        console.error('Failed to load settings', e)
      }
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 1000 - elapsed)
      setTimeout(() => {
        setAppReady(true)
      }, remaining)
    }
    init()
  }, [])

  if (!appReady) {
    const splashLogo = settings?.logo ? pb.files.getURL(settings, settings.logo) : null
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        {splashLogo ? (
          <img src={splashLogo} alt="CRM Logo" className="w-48 h-auto animate-pulse" />
        ) : (
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        )}
      </div>
    )
  }

  const bgUrl = settings?.login_background
    ? pb.files.getURL(settings, settings.login_background)
    : 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80'

  const logoUrl = settings?.logo ? pb.files.getURL(settings, settings.logo) : null

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setError('')
    setIsLoading(true)
    const res = await checkEmail(email)
    setIsLoading(false)

    if (res.success) {
      setStep(2)
    } else {
      setError(res.error || 'Erro ao verificar email.')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) return
    setError('')
    setNeedsVerification(false)
    setIsLoading(true)
    const res = await login(email, password)
    setIsLoading(false)

    if (!res.success) {
      setError(res.error || 'Erro ao fazer login.')
      if (res.needsVerification) {
        setNeedsVerification(true)
      }
    }
  }

  const handleResendVerification = async () => {
    setIsLoading(true)
    const res = await resendVerification(email)
    setIsLoading(false)
    if (res.success) {
      toast({
        title: 'Email enviado',
        description: 'Um novo link de verificação foi enviado para o seu email.',
      })
    } else {
      toast({
        title: 'Erro',
        description: res.error || 'Erro ao reenviar link.',
        variant: 'destructive',
      })
    }
  }

  const supportNumber = settings?.support_info?.replace(/\D/g, '') || ''

  return (
    <div className="flex min-h-screen w-full relative bg-gray-50">
      {/* Left Side */}
      <div
        className="hidden lg:block lg:w-1/2 bg-cover bg-center"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />

      {/* Right Side */}
      <div className="w-full lg:w-1/2 relative flex items-center justify-center overflow-hidden">
        {/* Blurred Background with -inset-4 to hide blurry edges */}
        <div
          className="absolute -inset-4 bg-cover bg-center blur-[12px] opacity-90"
          style={{ backgroundImage: `url(${bgUrl})` }}
        />

        {/* Overlay to ensure readability if image is too bright or dark */}
        <div className="absolute inset-0 bg-white/20" />

        {/* Solid Pure White Login Card */}
        <div className="relative z-10 w-full max-w-md p-10 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] mx-4 animate-fade-in-up">
          {logoUrl && (
            <div className="flex justify-center mb-8">
              <img src={logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Bem-vindo</h1>
            <p className="text-gray-500 mt-2">
              {step === 1 ? 'Insira seu email para continuar' : 'Insira sua senha para entrar'}
            </p>
          </div>

          <form onSubmit={step === 1 ? handleNext : handleLogin} className="space-y-6">
            {step === 1 ? (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                {error}
              </div>
            )}

            {needsVerification && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleResendVerification}
                disabled={isLoading}
              >
                Reenviar Link de Verificação
              </Button>
            )}

            <div className="flex items-center gap-3">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep(1)
                    setError('')
                    setNeedsVerification(false)
                  }}
                  disabled={isLoading}
                  className="px-3"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {step === 1 ? 'Avançar' : 'Entrar'}
              </Button>
            </div>
          </form>

          {step === 1 && (
            <div className="mt-6 text-center text-sm text-gray-500">
              <Link
                to="/reset-password"
                className="hover:text-primary underline underline-offset-4"
              >
                Esqueceu sua senha?
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      {supportNumber && (
        <a
          href={`https://wa.me/55${supportNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:bg-[#20bd5a] transition-transform hover:scale-105 z-50 flex items-center justify-center animate-fade-in"
          title="Fale com o Suporte"
        >
          <MessageCircle className="w-7 h-7" />
        </a>
      )}
    </div>
  )
}
