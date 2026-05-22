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
  ) => Promise<{ success: boolean; needsVerification?: boolean; error?: string }>
  checkEmail: (email: string) => Promise<{ success: boolean; error?: string }>
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>
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

  const checkEmail = async (email: string) => {
    try {
      const checkRes = await pb.send('/backend/v1/auth/check-email', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
      })
      if (!checkRes.exists) {
        return {
          success: false,
          error:
            'Usuário não cadastrado no sistema. Entre em contato com o Proprietário da sua companhia para liberar o acesso.',
        }
      }
      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.message || 'Erro ao verificar o e-mail.',
      }
    }
  }

  const login = async (email: string, pass: string) => {
    try {
      const checkRes = await checkEmail(email)
      if (!checkRes.success) {
        return checkRes
      }

      const authData = await pb.collection('users').authWithPassword(email, pass)
      const record = authData.record as User

      setRealUser(record)
      return { success: true }
    } catch (err: any) {
      const msg = err.response?.message || 'Verifique seu e-mail e senha e tente novamente.'

      if (msg.includes('verificado')) {
        return { success: false, error: msg, needsVerification: true }
      }

      return {
        success: false,
        error:
          msg === 'Failed to authenticate.'
            ? 'Credenciais inválidas. Verifique seu e-mail e senha.'
            : msg,
      }
    }
  }

  const requestPasswordReset = async (email: string) => {
    try {
      await pb.send('/backend/v1/auth/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email, origin: window.location.origin }),
      })
      return { success: true }
    } catch (err: any) {
      return {
        success: false,
        error: err.response?.message || 'Erro ao solicitar redefinição de senha.',
      }
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
        checkEmail,
        requestPasswordReset,
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
