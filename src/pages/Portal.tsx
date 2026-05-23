import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Loader2 } from 'lucide-react'

export default function Portal() {
  const [loading, setLoading] = useState(false)
  const [splash, setSplash] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [settings, setSettings] = useState<any>(null)
  const [needsVerification, setNeedsVerification] = useState(false)

  const { login, resendVerification } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    pb.collection('system_settings')
      .getFirstListItem('')
      .then((res) => setSettings(res))
      .catch(() => {})

    const timer = setTimeout(() => {
      setSplash(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNeedsVerification(false)
    const res = await login(email, password)
    if (!res.success) {
      toast({
        title: 'Erro de Autenticação',
        description: res.error,
        variant: 'destructive',
      })
      if (res.needsVerification) {
        setNeedsVerification(true)
      }
    }
    setLoading(false)
  }

  const handleResendVerification = async () => {
    const res = await resendVerification(email)
    if (res.success) {
      toast({ title: 'Link enviado com sucesso. Verifique seu e-mail.' })
      setNeedsVerification(false)
    } else {
      toast({ title: 'Erro ao reenviar', description: res.error, variant: 'destructive' })
    }
  }

  const bgUrl = settings?.login_background
    ? pb.files.getURL(settings, settings.login_background)
    : 'https://img.usecurling.com/p/1920/1080?q=solar%20panels&color=black'

  const logoUrl = settings?.hub_logo
    ? pb.files.getURL(settings, settings.hub_logo)
    : settings?.logo
      ? pb.files.getURL(settings, settings.logo)
      : ''

  if (splash) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-24 object-contain" />
          ) : (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen w-full relative flex flex-col md:flex-row"
      style={{
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Left side: transparent/clear */}
      <div className="hidden md:flex md:w-1/2" />

      {/* Right side: blurred overlay and login card */}
      <div className="w-full md:w-1/2 min-h-screen flex items-center justify-center relative">
        {/* Subtle blur overlay only on this side */}
        <div className="absolute inset-0 bg-background/30 backdrop-blur-md" />

        <Card className="w-full max-w-md z-10 mx-4 border-none shadow-2xl bg-background/95 backdrop-blur-xl">
          <CardHeader className="space-y-4 items-center pt-8">
            {logoUrl && <img src={logoUrl} alt="Logo" className="h-16 object-contain mb-2" />}
            <CardTitle className="text-2xl text-center font-bold">Bem-vindo</CardTitle>
            <CardDescription className="text-center text-base">
              Faça login para acessar a plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Senha</Label>
                  <a
                    href="/reset-password"
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Esqueceu a senha?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base mt-2" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Entrar
              </Button>
            </form>

            {needsVerification && (
              <div className="mt-6 p-4 bg-amber-50/80 border border-amber-200 rounded-lg animate-fade-in">
                <p className="text-sm text-amber-800 mb-3 font-medium">
                  Seu e-mail ainda não foi verificado.
                </p>
                <Button
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                  onClick={handleResendVerification}
                >
                  Reenviar link de verificação
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
