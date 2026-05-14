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
import { Loader2, ArrowLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

const DEFAULT_LOGO_URL = 'https://img.usecurling.com/i?q=elektra&color=azure'

export default function LoginManual() {
  const [email, setEmail] = useState('elektraengenhariasolucoes@gmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [loading, setLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO_URL)
  const { login } = useAuth()
  const navigate = useNavigate()

  const [systemName, setSystemName] = useState('Elektra CRM')

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
      </div>
    </div>
  )
}
