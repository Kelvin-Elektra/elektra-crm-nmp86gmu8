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
  simulatedUser: User | null
  isAuthenticated: boolean
  login: (
    email: string,
    pass: string,
  ) => Promise<{ success: boolean; needsPasswordSetup?: boolean }>
  adminLogin: (email: string, pass: string) => Promise<boolean>
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
        .catch((err: any) => {
          if (err.status !== 0) {
            pb.authStore.clear()
            setRealUser(null)
            setSimulatedUser(null)
            toast({
              title: 'Sessão Expirada',
              description: 'Sua sessão é inválida ou expirou. Faça login novamente.',
              variant: 'destructive',
            })
          }
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

  const login = async (email: string, pass: string) => {
    try {
      const preCheck = await pb.send('/backend/v1/auth/pre-check', {
        method: 'POST',
        body: { email },
      })

      if (!preCheck.exists) {
        toast({
          title: 'Credenciais inválidas',
          description: 'Verifique seu e-mail e senha.',
          variant: 'destructive',
        })
        return { success: false }
      }

      if (preCheck.error) {
        toast({
          title: 'Acesso Negado',
          description: preCheck.message,
          variant: 'destructive',
        })
        return { success: false }
      }

      if (!preCheck.hasPassword) {
        try {
          await pb.send('/backend/v1/auth/request-reset', {
            method: 'POST',
            body: { email, origin: window.location.origin },
          })
          toast({
            title: 'Configuração de Senha',
            description: 'Enviamos um link para o seu e-mail para você criar sua senha de acesso.',
          })
          return { success: false, needsPasswordSetup: true }
        } catch (err: any) {
          toast({
            title: 'Erro ao enviar link',
            description: err.response?.message || 'Ocorreu um erro ao enviar o e-mail.',
            variant: 'destructive',
          })
          return { success: false }
        }
      }

      const authData = await pb.collection('users').authWithPassword(email, pass)
      const record = authData.record as User

      setRealUser(record)
      return { success: true }
    } catch (err: any) {
      toast({
        title: 'Falha no login',
        description: err.response?.message || 'Verifique seu e-mail e senha e tente novamente.',
        variant: 'destructive',
      })
      return { success: false }
    }
  }

  const refreshAuth = async () => {
    if (pb.authStore.isValid) {
      try {
        const res = await pb.collection('users').authRefresh()
        setRealUser(res.record as User)
      } catch (err: any) {
        if (err.status !== 0) {
          pb.authStore.clear()
          setRealUser(null)
          setSimulatedUser(null)
        }
      }
    }
  }

  const adminLogin = async (email: string, pass: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, pass)
      const record = authData.record as User

      if (
        record.role !== 'User_elektra' &&
        record.email !== 'elektraengenhariasolucoes@gmail.com'
      ) {
        pb.authStore.clear()
        toast({
          title: 'Acesso Restrito',
          description: 'Seu usuário não possui permissão administrativa.',
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
    } catch (err: any) {
      toast({
        title: 'Falha no login',
        description: err.response?.message || 'Verifique seu e-mail e senha.',
        variant: 'destructive',
      })
      return false
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
    if (simulatedUser) {
      setSimulatedUser({ ...simulatedUser, company_id: id })
    } else if (realUser) {
      setRealUser({ ...realUser, company_id: id })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        realUser,
        simulatedUser,
        isAuthenticated,
        login,
        adminLogin,
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
