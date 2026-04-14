import { createContext, useContext, useState, ReactNode } from 'react'
import { users, subscriptions } from '@/lib/mockData'
import { useToast } from '@/hooks/use-toast'

export type User = {
  id: string
  email: string
  name: string
  role: string
  status: string
  companyId: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, pass: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const { toast } = useToast()

  const login = async (email: string, pass: string) => {
    return new Promise<boolean>((resolve) => {
      setTimeout(() => {
        const foundUser = users.find((u) => u.email === email && u.password === pass)

        if (!foundUser) {
          toast({ title: 'Credenciais inválidas', variant: 'destructive' })
          return resolve(false)
        }

        if (foundUser.status !== 'active') {
          toast({
            title: 'Acesso Negado',
            description: 'Usuário bloqueado. Entre em contato com o administrador.',
            variant: 'destructive',
          })
          return resolve(false)
        }

        const sub = subscriptions.find((s) => s.companyId === foundUser.companyId)
        if (!sub || sub.status !== 'active') {
          toast({
            title: 'Assinatura Inativa',
            description: 'Plano expirado. Regularize sua assinatura para acessar o sistema.',
            variant: 'destructive',
          })
          return resolve(false)
        }

        const { password, ...safeUser } = foundUser
        setUser(safeUser)
        resolve(true)
      }, 800)
    })
  }

  const logout = () => setUser(null)

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
