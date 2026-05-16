import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { Link } from 'react-router-dom'

export default function ElektraAdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { user, loading: authLoading, adminLogin, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'User_elektra' || user.email === 'elektraengenhariasolucoes@gmail.com') {
        navigate('/elektra-admin/dashboard')
      } else {
        navigate('/dashboard')
      }
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const success = await adminLogin(email, password)
    if (success) {
      navigate('/elektra-admin/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-800 bg-slate-950 text-slate-100">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center">
              <ShieldAlert className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Portal do Mantenedor</CardTitle>
          <CardDescription className="text-slate-400">
            Acesso restrito para administradores do sistema Elektra CRM.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                required
                className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-blue-600"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                required
                className="bg-slate-900 border-slate-800 text-slate-100 focus-visible:ring-blue-600"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-4"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar no Portal'}
            </Button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-800 text-center">
            <Link
              to="/"
              className="text-sm text-slate-400 hover:text-slate-300 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Portal Principal
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
