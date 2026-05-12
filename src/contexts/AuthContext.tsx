import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export type User = {
  id: string
  email: string
  name: string
  role: string
  status: string
  company_id: string
  verified: boolean
  is_owner: boolean
}

interface AuthContextType {
  user: User | null
  login: (email: string, pass: string) => Promise<boolean>
  logout: () => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(pb.authStore.record as User | null)
  const [loading, setLoading] = useState(() => {
    return new URLSearchParams(window.location.search).has('token')
  })
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (token) {
      params.delete('token')
      const newSearch = params.toString()
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '')
      window.history.replaceState({}, document.title, newUrl)

      pb.send('/backend/v1/sso-login', {
        method: 'POST',
        body: JSON.stringify({ token }),
        headers: { 'Content-Type': 'application/json' },
      })
        .then((authData) => {
          pb.authStore.save(authData.token, authData.record)
          setUser(authData.record as User)
          navigate('/dashboard', { replace: true })
        })
        .catch((err) => {
          console.error('SSO error', err)
          pb.authStore.clear()
          setUser(null)
          toast({
            title: 'Erro de Autenticação',
            description: 'Token inválido ou expirado.',
            variant: 'destructive',
          })
          navigate('/', { replace: true })
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }

    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record as User | null)
    })
    return () => {
      unsubscribe()
    }
  }, [navigate, toast])

  const login = async (email: string, pass: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, pass)
      const record = authData.record as User

      if (!record.verified) {
        pb.authStore.clear()
        toast({
          title: 'Email não verificado',
          description: 'Por favor, verifique seu e-mail antes de fazer login.',
          variant: 'destructive',
        })
        return false
      }

      const company = await pb.collection('companies').getOne(record.company_id)
      if (company.status !== 'active') {
        pb.authStore.clear()
        toast({
          title: 'Acesso Negado',
          description: 'A assinatura da sua empresa está inativa.',
          variant: 'destructive',
        })
        return false
      }

      setUser(record)
      return true
    } catch (err) {
      toast({
        title: 'Credenciais inválidas',
        description: 'Verifique seu e-mail e senha.',
        variant: 'destructive',
      })
      return false
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
