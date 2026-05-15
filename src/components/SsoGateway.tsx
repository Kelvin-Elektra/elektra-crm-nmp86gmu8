import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, AlertCircle, RefreshCw, Terminal, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import pb from '@/lib/pocketbase/client'

export function SsoGateway({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams()
  const ssoToken = searchParams.get('sso_token')
  const { loginWithSso, loading } = useAuth()
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(!!ssoToken)
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [showDebug, setShowDebug] = useState(false)

  const [manualToken, setManualToken] = useState('')
  const [manualDiagnostic, setManualDiagnostic] = useState<any>(null)
  const [isManualLoading, setIsManualLoading] = useState(false)

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
            navigate('/', { replace: true })
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

  const runManualDiagnostic = async () => {
    if (!manualToken.trim()) return
    setIsManualLoading(true)
    setManualDiagnostic(null)
    try {
      const result = await pb.send('/backend/v1/sso/debug', {
        method: 'POST',
        body: { sso_token: manualToken.trim() },
      })
      setManualDiagnostic(result)
    } catch (err: any) {
      setManualDiagnostic(err.response?.data || err.response || { error: err.message })
    } finally {
      setIsManualLoading(false)
    }
  }

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
        <div className="w-full max-w-3xl bg-background p-8 rounded-xl shadow-2xl border border-destructive/20 animate-fade-in-up max-h-[90vh] overflow-y-auto">
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

          <div className="mb-8 border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors text-left"
            >
              <div className="flex items-center gap-2 font-semibold">
                <Terminal className="h-5 w-5" />
                Informações de Diagnóstico
              </div>
              {showDebug ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>

            {showDebug && (
              <div className="p-4 space-y-6 bg-background border-t">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Endpoint
                  </h3>
                  <code className="block bg-muted p-2 rounded text-sm font-mono">
                    POST /backend/v1/sso/login
                  </code>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    HTTP Status
                  </h3>
                  <code className="block bg-muted p-2 rounded text-sm font-mono">
                    {diagnostic.status || '500 Internal Server Error'}
                  </code>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Request Payload (Decoded JWT)
                  </h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono border">
                    {diagnostic.payload
                      ? JSON.stringify(diagnostic.payload, null, 2)
                      : 'Nenhum payload decodificado disponível.'}
                  </pre>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Server Response (Raw)
                  </h3>
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono border">
                    {JSON.stringify(diagnostic, null, 2)}
                  </pre>
                </div>

                <div className="space-y-4 pt-6 border-t mt-6">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                    Diagnóstico Manual de Token
                  </h3>
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Cole o sso_token aqui..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="font-mono text-xs min-h-[100px]"
                    />
                    <Button
                      onClick={runManualDiagnostic}
                      disabled={isManualLoading || !manualToken.trim()}
                      variant="secondary"
                      className="w-full"
                    >
                      {isManualLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Executar Diagnóstico
                    </Button>
                  </div>

                  {manualDiagnostic && (
                    <div className="space-y-2 mt-4 animate-fade-in">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Resultado do Diagnóstico Manual
                      </h3>
                      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono border whitespace-pre-wrap break-all">
                        {JSON.stringify(manualDiagnostic, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
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
