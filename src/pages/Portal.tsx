import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, Sun, ArrowLeft } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'

export default function Portal() {
  const { login } = useAuth()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'login' | 'check_email'>('login')
  const [sysLogo, setSysLogo] = useState<string | null>(null)

  useEffect(() => {
    pb.collection('system_settings')
      .getFirstListItem('')
      .then((record) => {
        if (record.logo) {
          setSysLogo(pb.files.getURL(record, record.logo))
        }
      })
      .catch(() => {})
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await login(email, password)
    setLoading(false)
    if (res.needsPasswordSetup) {
      setMode('check_email')
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: 'Aviso', description: 'Por favor, informe seu e-mail no campo acima.' })
      return
    }
    setLoading(true)
    try {
      await pb.send('/backend/v1/auth/request-reset', {
        method: 'POST',
        body: { email, origin: window.location.origin },
      })
      setMode('check_email')
      toast({ title: 'E-mail enviado', description: 'Verifique sua caixa de entrada.' })
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o e-mail.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-background">
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 items-center justify-center overflow-hidden">
        <img
          src="https://img.usecurling.com/p/1200/1600?q=modern%20solar%20panels&color=blue"
          alt="Solar Panels"
          className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-overlay"
        />
        <div className="relative z-10 p-12 text-white max-w-2xl animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6">
            <Sun className="h-10 w-10 text-yellow-400" />
            <span className="text-2xl font-bold tracking-tight">Elektra CRM</span>
          </div>
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Gestão inteligente para integradores
          </h1>
          <p className="text-xl text-slate-300">
            Acompanhe seus leads, gere propostas e feche negócios de energia solar em poucos
            cliques.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background relative">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            {sysLogo ? (
              <img src={sysLogo} alt="Logo" className="h-12 object-contain mb-6" />
            ) : (
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                <Sun className="h-6 w-6" />
              </div>
            )}

            {mode === 'login' && (
              <>
                <h2 className="text-3xl font-bold tracking-tight">Bem-vindo de volta!</h2>
                <p className="text-muted-foreground mt-2">Faça login para acessar sua conta.</p>
              </>
            )}
          </div>

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Seu E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" />
                    <label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Lembrar-me
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 font-normal h-auto text-sm"
                    onClick={handleForgotPassword}
                  >
                    Esqueceu a senha?
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
            </form>
          )}

          {mode === 'check_email' && (
            <div className="text-center space-y-6 animate-fade-in-up">
              <div className="mx-auto w-16 h-16 bg-blue-50 text-blue-600 flex items-center justify-center rounded-full">
                <Mail className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Verifique seu e-mail</h2>
                <p className="text-muted-foreground text-sm">
                  Enviamos um link para <strong>{email}</strong> para você configurar sua senha de
                  acesso.
                </p>
              </div>
              <div className="space-y-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-11"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enviar novamente
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-11 text-muted-foreground"
                  onClick={() => setMode('login')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Já cadastrei a senha
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
