import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('Verificando...')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setStatus('Token inválido ou não encontrado.')
      return
    }

    pb.send('/backend/v1/auth/confirm-verification', {
      method: 'POST',
      body: JSON.stringify({ token }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(() => {
        setStatus('E-mail verificado com sucesso! Redirecionando para o login...')
        setTimeout(() => navigate('/'), 3000)
      })
      .catch((err) => {
        setStatus('Erro ao verificar e-mail: ' + (err.response?.message || 'Token expirado.'))
      })
  }, [params, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader>
          <CardTitle className="text-center text-xl">Verificação de E-mail</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center font-medium">{status}</p>
        </CardContent>
      </Card>
    </div>
  )
}
