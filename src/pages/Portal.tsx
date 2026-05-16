import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert, Sun, ArrowRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export default function Portal() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'User_elektra') {
        navigate('/elektra-admin/dashboard')
      } else {
        navigate('/dashboard')
      }
    }
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-slate-200 bg-white">
        <CardHeader className="space-y-3 text-center pb-6">
          <div className="flex justify-center mb-2">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Sun className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">
            Elektra CRM
          </CardTitle>
          <CardDescription className="text-slate-500 text-base">
            O seu portal de gestão integrado.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <p className="text-center text-sm text-slate-600 px-4">
              Para acessar o CRM, utilize sua conta do Elektra Solution Hub. O login é automático e
              unificado.
            </p>
            <Button
              className="w-full h-12 text-base font-medium shadow-sm hover:shadow-md transition-all"
              onClick={() => {
                window.location.href =
                  import.meta.env.VITE_HUB_URL || 'https://hub.elektrasolucoes.tech'
              }}
            >
              Acessar via Solution Hub
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-center">
            <Link
              to="/elektra-admin"
              className="text-xs text-slate-400 hover:text-slate-600 flex items-center transition-colors"
            >
              <ShieldAlert className="mr-1 h-3 w-3" />
              Acesso Restrito (Mantenedores)
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
