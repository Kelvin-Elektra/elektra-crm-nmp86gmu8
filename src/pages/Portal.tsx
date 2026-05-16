import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function Portal() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center space-y-6 border border-slate-100">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Elektra CRM</h1>
        <p className="text-slate-600 text-lg">
          Bem-vindo ao portal. Faça login para acessar o sistema.
        </p>
        <div className="pt-6 flex flex-col gap-4">
          <Button asChild className="w-full text-base h-12">
            <Link to="/loginmanual">Fazer Login Manual</Link>
          </Button>
          <Button asChild variant="outline" className="w-full text-base h-12">
            <Link to="/elektra-admin">Acesso de Mantenedor</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
