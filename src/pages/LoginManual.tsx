import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Loader2, ArrowLeft, Bug, ChevronDown } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Textarea } from '@/components/ui/textarea'

const DEFAULT_LOGO_URL = 'https://img.usecurling.com/i?q=elektra&color=azure'

export default function LoginManual() {
  const [email, setEmail] = useState('elektraengenhariasolucoes@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL)
  const { login } = useAuth()
  const navigate = useNavigate()

  const [systemName, setSystemName] = useState('Elektra CRM')

  const [ssoToken, setSsoToken] = useState('')
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugResult, setDebugResult] = useState<any>(null)

  const handleDebug = async () => {
    if (!ssoToken) return
    setDebugLoading(true)
    setDebugResult(null)
    try {
      const res = await pb.send('/backend/v1/sso/debug', {
        method: 'POST',
        body: JSON.stringify({ sso_token: ssoToken }),
      })
      setDebugResult(res)
    } catch (err: any) {
      setDebugResult(err.response || { error: err.message })
    } finally {
      setDebugLoading(false)
    }
  }

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const res = await pb.send('/backend/v1/public/system-settings', { method: 'GET' })
        if (res.system_name) setSystemName(res.system_name)
        if (res.logoUrl) {
          setLogoUrl(`${pb.baseUrl}${res.logoUrl}`)
        } else {
          setLogoUrl('')
        }
      } catch (err) {
        console.error('Error fetching system settings:', err)
        setLogoUrl('')
      }
    }
    fetchLogo()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const success = await login(email, password)
    setLoading(false)
    if (success) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="flex flex-col items-center mb-8 text-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={systemName}
              className="h-16 object-contain mb-4 rounded-xl opacity-75"
            />
          ) : (
            <h1 className="text-2xl font-bold text-primary mb-4 tracking-tighter opacity-75">
              {systemName}
            </h1>
          )}
        </div>

        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <CardTitle>Acesso Manual</CardTitle>
            <CardDescription>Insira suas credenciais corporativas</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Seu email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="transition-all focus:ring-primary"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Senha</Label>
                  <Link
                    to="/esqueci-minha-senha"
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Esqueci minha senha?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="transition-all focus:ring-primary"
                />
              </div>
              <Button
                type="submit"
                className="w-full active:scale-[0.98] transition-transform mt-4"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Validando...' : 'Entrar no Sistema'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t p-4 bg-muted/20">
            <Link
              to="/"
              className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao Portal
            </Link>
          </CardFooter>
        </Card>

        <div className="mt-8">
          <Collapsible className="bg-background border rounded-lg shadow-sm">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex justify-between items-center p-4 h-auto"
              >
                <div className="flex items-center text-muted-foreground">
                  <Bug className="h-4 w-4 mr-2" />
                  <span className="font-semibold">Ferramenta de Diagnóstico SSO</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-4 border-t space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sso_token">SSO Token</Label>
                <Textarea
                  id="sso_token"
                  placeholder="Cole o token JWT aqui..."
                  value={ssoToken}
                  onChange={(e) => setSsoToken(e.target.value)}
                  className="font-mono text-xs min-h-[100px]"
                />
              </div>
              <Button
                onClick={handleDebug}
                disabled={debugLoading || !ssoToken}
                variant="secondary"
                className="w-full"
                type="button"
              >
                {debugLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Testar Token
              </Button>

              {debugResult && (
                <div className="space-y-2 mt-4 animate-in fade-in slide-in-from-top-2">
                  <Label>Resposta do Servidor (Raw)</Label>
                  <pre className="bg-muted p-4 rounded-md text-xs font-mono overflow-auto max-h-[300px] border whitespace-pre-wrap break-all">
                    {JSON.stringify(debugResult, null, 2)}
                  </pre>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  )
}
