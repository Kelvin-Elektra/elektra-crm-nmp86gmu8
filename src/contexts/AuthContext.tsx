import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export type User = {
  id: string
  email: string
  name: string
  phone?: string
  role: string
  role_company: string
  status: string
  company_id: string
  verified: boolean
  hub_user_id?: string
}

interface AuthContextType {
  user: User | null
  realUser: User | null
  isAuthenticated: boolean
  adminLogin: (email: string, pass: string) => Promise<boolean>
  loginWithSso: (token: string) => Promise<{ success: boolean; diagnostic?: any }>
  logout: () => void
  simulateUser: (user: User) => void
  exitSimulation: () => void
  refreshAuth: () => Promise<void>
  setCompanyId: (id: string) => void
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [realUser, setRealUser] = useState<User | null>(
    pb.authStore.isValid ? (pb.authStore.record as User) : null,
  )
  const [simulatedUser, setSimulatedUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const user = simulatedUser || realUser
  // Evita redirecionamento prematuro caso o usuário esteja nulo durante a fase de loading
  const isAuthenticated = pb.authStore.isValid && (!!user || loading)

  useEffect(() => {
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      setRealUser(pb.authStore.isValid ? (record as User) : null)
      if (!record || !pb.authStore.isValid) setSimulatedUser(null)
    })

    if (pb.authStore.isValid) {
      pb.collection('users')
        .authRefresh()
        .then((res) => {
          setRealUser(res.record as User)
        })
        .catch(() => {
          pb.authStore.clear()
          setRealUser(null)
          setSimulatedUser(null)
          toast({
            title: 'Sessão Expirada',
            description: 'Sua sessão é inválida ou expirou. Faça login novamente.',
            variant: 'destructive',
          })
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }

    return () => {
      unsubscribe()
    }
  }, [toast])

  const refreshAuth = async () => {
    if (pb.authStore.isValid) {
      try {
        const res = await pb.collection('users').authRefresh()
        setRealUser(res.record as User)
      } catch (err) {
        pb.authStore.clear()
        setRealUser(null)
        setSimulatedUser(null)
      }
    }
  }

  const adminLogin = async (email: string, pass: string) => {
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

      if (
        record.role !== 'User_elektra' &&
        record.email !== 'elektraengenhariasolucoes@gmail.com'
      ) {
        pb.authStore.clear()
        toast({
          title: 'Acesso Restrito',
          description: 'Por favor, utilize o login via Elektra Hub (SSO).',
          variant: 'destructive',
        })
        return false
      }

      if (record.company_id && record.company_id.trim() !== '') {
        try {
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
        } catch (err: any) {
          console.error('Company not found:', err)
          if (err.status === 404) {
            toast({
              title: 'Aviso',
              description: 'O registro da sua empresa não foi encontrado.',
              variant: 'default',
            })
          } else {
            pb.authStore.clear()
            toast({
              title: 'Acesso Negado',
              description: 'Empresa vinculada não encontrada ou inválida.',
              variant: 'destructive',
            })
            return false
          }
        }
      }

      setRealUser(record)
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

  const loginWithSso = async (ssoToken: string) => {
    try {
      const response = await pb.send(`/backend/v1/sso?sso_token=${encodeURIComponent(ssoToken)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      pb.authStore.save(response.token, response.record)

      const record = response.record as User

      if (!record.verified) {
        pb.authStore.clear()
        toast({
          title: 'Email não verificado',
          description: 'Por favor, verifique seu e-mail antes de fazer login.',
          variant: 'destructive',
        })
        return { success: false, diagnostic: { error: 'Email não verificado', status: 403 } }
      }

      setRealUser(record)
      return { success: true }
    } catch (err: any) {
      pb.authStore.clear()
      const diagnostic = err.response || { error: err.message, status: err.status || 500 }
      toast({
        title: 'Falha na autenticação via Hub',
        description: diagnostic.error || 'Por favor, tente novamente ou use sua senha.',
        variant: 'destructive',
      })
      return { success: false, diagnostic }
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setRealUser(null)
    setSimulatedUser(null)
  }

  const simulateUser = (simUser: User) => {
    setSimulatedUser(simUser)
  }

  const exitSimulation = () => {
    setSimulatedUser(null)
  }

  const setCompanyId = (id: string) => {
    setRealUser((prev) => (prev ? { ...prev, company_id: id } : null))
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        realUser,
        isAuthenticated,
        adminLogin,
        loginWithSso,
        logout,
        simulateUser,
        exitSimulation,
        refreshAuth,
        setCompanyId,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
