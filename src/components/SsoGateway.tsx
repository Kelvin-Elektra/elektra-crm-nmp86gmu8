import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export function SsoGateway({ children }: { children: React.ReactNode }) {
  const [searchParams] = useSearchParams()
  const ssoToken = searchParams.get('sso_token')
  const { loginWithSso, loading } = useAuth()
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(!!ssoToken)
  const attempted = useRef(false)

  useEffect(() => {
    if (ssoToken && !attempted.current) {
      attempted.current = true
      setIsProcessing(true)

      const processSso = async () => {
        const success = await loginWithSso(ssoToken)

        // Remove sso_token from URL after processing has resolved
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('sso_token')
        window.history.replaceState({}, '', newUrl.toString())

        setIsProcessing(false)

        if (success) {
          const targetPath = window.location.pathname
          if (targetPath === '/' || targetPath === '/login') {
            navigate('/dashboard', { replace: true })
          } else {
            navigate(`${targetPath}${newUrl.search}`, { replace: true })
          }
        } else {
          navigate('/', { replace: true })
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

  return <>{children}</>
}
