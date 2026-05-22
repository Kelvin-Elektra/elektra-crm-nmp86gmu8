import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function Portal() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'login' | 'forgot_password'>('login')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const { login } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    pb.collection('system_settings')
      .getFirstListItem('')
      .then((res) => {
        if (res.logo) setLogoUrl(pb.files.getURL(res, res.logo))
      })
      .catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const result = await login(email, password)
    if (result.success) {
      navigate('/dashboard')
    } else if (result.needsPasswordSetup) {
      toast({
        title: 'Configuração de Senha',
        description:
          'Sua conta ainda não possui senha. Enviamos um link de configuração para seu e-mail!',
        duration: 8000,
      })
    }
    setLoading(false)
  }

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({
        title: 'Aviso',
        description: 'Por favor, informe seu email.',
        variant: 'destructive',
      })
      return
    }
    setLoading(true)
    try {
      await pb.send('/backend/v1/auth/request-reset', {
        method: 'POST',
        body: { email, origin: window.location.origin },
      })
      toast({
        title: 'E-mail enviado!',
        description: 'Se o endereço existir em nossa base, você receberá um link de redefinição.',
      })
      setView('login')
    } catch (err) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao processar sua solicitação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block relative w-1/2 bg-slate-900">
        <img
          src="https://img.usecurling.com/p/1200/1600?q=solar%20panels%20modern%20house"
          alt="Solar Panels"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
        <div className="absolute bottom-16 left-16 right-16 text-white max-w-xl">
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Gestão inteligente para sua integradora solar
          </h1>
          <p className="text-lg text-slate-300">
            Acelere suas vendas, automatize propostas comerciais e tenha controle total do seu
            negócio em uma única plataforma estruturada.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up">
          <div className="flex flex-col items-center sm:items-start">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 mb-8 object-contain" />
            ) : (
              <div className="h-16 mb-8 flex items-center">
                <span className="text-2xl font-bold text-slate-800">Elektra CRM</span>
              </div>
            )}

            {view === 'login' ? (
              <>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Bem-vindo de volta!
                </h2>
                <p className="text-sm text-slate-500 mt-2">Acesse sua conta para continuar</p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                  Recuperar Senha
                </h2>
                <p className="text-sm text-slate-500 mt-2">
                  Enviaremos um link para criar uma nova senha
                </p>
              </>
            )}
          </div>

          {view === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <button
                    type="button"
                    onClick={() => setView('forgot_password')}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Entrar na Plataforma
              </Button>
            </form>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div className="flex flex-col gap-4">
                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Enviar Link de Recuperação
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setView('login')}
                  className="h-12"
                  disabled={loading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o login
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
