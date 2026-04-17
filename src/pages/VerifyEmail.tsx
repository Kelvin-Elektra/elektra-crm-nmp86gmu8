import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      pb.collection('users')
        .confirmVerification(token)
        .then(() => setStatus('success'))
        .catch(() => setStatus('error'))
    } else {
      setStatus('error')
    }
  }, [searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center shadow-xl border-border/50">
        <CardHeader>
          <CardTitle className="text-2xl">Verificação de Conta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Verificando seu email...</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-muted-foreground mb-6">
                Sua conta foi verificada com sucesso! Você já pode acessar o sistema.
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Ir para o Login
              </Button>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-muted-foreground mb-6">
                Link inválido ou expirado. Por favor, solicite um novo link de verificação ou
                contate o administrador.
              </p>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                Voltar
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
