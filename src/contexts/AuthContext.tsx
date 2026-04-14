import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export type User = {
  id: string
  email: string
  name: string
  role: string
  status: string
  company_id: string
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
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setUser(record as User | null)
    })
    setLoading(false)
    return () => {
      unsubscribe()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, pass)
      const record = authData.record as User

      if (record.status !== 'active') {
        pb.authStore.clear()
        toast({
          title: 'Acesso Negado',
          description: 'Usuário bloqueado pelo administrador.',
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
