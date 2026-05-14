import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SsoGateway({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams()
  const ssoToken = searchParams.get('sso_token')
  const { loginWithSso, loading } = useAuth()
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(!!ssoToken)
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const attempted = useRef(false)

  useEffect(() => {
    if (ssoToken && !attempted.current) {
      attempted.current = true
      setIsProcessing(true)

      const processSso = async () => {
        const result = await loginWithSso(ssoToken)

        setIsProcessing(false)

        if (result.success) {
          const newUrl = new URL(window.location.href)
          newUrl.searchParams.delete('sso_token')
          window.history.replaceState({}, '', newUrl.toString())

          const targetPath = window.location.pathname
          if (targetPath === '/' || targetPath === '/login' || targetPath === '/loginmanual') {
            navigate('/dashboard', { replace: true })
          } else {
            navigate(`${targetPath}${newUrl.search}`, { replace: true })
          }
        } else {
          setDiagnostic(result.diagnostic)
        }
      }

      processSso()
    }
  }, [ssoToken, loginWithSso, navigate])

  if (isProcessing || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <div className="flex flex-col items-center justify-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground animate-pulse text-center">
            {isProcessing ? 'Autenticando via Elektra Hub...' : 'Carregando...'}
          </p>
        </div>
      </div>
    )
  }

  if (diagnostic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <div className="w-full max-w-3xl bg-background p-8 rounded-xl shadow-2xl border border-destructive/20 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-6 text-destructive">
            <AlertCircle className="h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">Falha no Login SSO</h1>
          </div>

          <div className="mb-6 space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Detalhes do Erro</h2>
            <p className="text-muted-foreground text-lg bg-destructive/10 p-4 rounded-lg border border-destructive/20">
              {diagnostic.error || diagnostic.message || 'Erro desconhecido.'}
            </p>
          </div>

          {diagnostic.payload && (
            <div className="mb-6 space-y-2">
              <h3 className="font-semibold text-foreground">Payload do Token (Decodificado)</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono border text-muted-foreground">
                {JSON.stringify(diagnostic.payload, null, 2)}
              </pre>
            </div>
          )}

          <div className="mb-8 space-y-2">
            <h3 className="font-semibold text-foreground">Resposta Bruta</h3>
            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono border text-muted-foreground">
              {JSON.stringify(diagnostic, null, 2)}
            </pre>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
            <Button
              onClick={() => (window.location.href = '/')}
              variant="default"
              className="flex-1"
            >
              Voltar ao Portal
            </Button>
            <Button
              onClick={() => (window.location.href = '/loginmanual')}
              variant="outline"
              className="flex-1"
            >
              Tentar Login Manual
            </Button>
            <Button onClick={() => window.location.reload()} variant="secondary" className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
