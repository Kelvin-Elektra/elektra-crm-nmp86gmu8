import { useAuth } from '@/contexts/AuthContext'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useLocation } from 'react-router-dom'
import { LogOut, User as UserIcon, RefreshCw, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
const routeNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pipeline': 'Pipeline de Vendas',
  '/leads': 'Gestão de Leads',
  '/negociacoes': 'Negociações Ativas',
  '/propostas': 'Propostas Comerciais',
  '/configuracoes': 'Configurações',
}

export function AppHeader() {
  const { user, simulatedUser, exitSimulation, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const loadLogos = async () => {
      try {
        let logoUrl = null
        try {
          const sysSettings = await pb.collection('system_settings').getFirstListItem('')
          if (sysSettings?.logo) {
            logoUrl = pb.files.getURL(sysSettings, sysSettings.logo)
          }
        } catch {
          /* intentionally ignored */
        }
        setCompanyLogo(logoUrl)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoaded(true)
      }
    }
    loadLogos()
  }, [user?.company_id])

  useRealtime('system_settings', (e) => {
    if (e.record.logo) {
      setCompanyLogo(pb.files.getURL(e.record, e.record.logo))
    }
  })

  const title = routeNames[location.pathname] || 'Visão Geral'
  const initials = user?.name?.substring(0, 2).toUpperCase() || 'US'

  return (
    <>
      {simulatedUser && (
        <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between text-sm font-medium z-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Simulando acesso como: {simulatedUser.name} ({simulatedUser.email})
          </div>
          <Button
            size="sm"
            variant="outline"
            className="bg-white/20 border-white/40 text-white hover:bg-white/30 h-8"
            onClick={() => {
              exitSimulation()
              navigate('/elektra-admin/dashboard')
            }}
          >
            Encerrar Simulação
          </Button>
        </div>
      )}
      <header className="h-16 flex shrink-0 items-center justify-between border-b bg-background px-4 shadow-sm z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="-ml-2 md:hidden" />
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          {isLoaded && companyLogo && (
            <img
              src={companyLogo}
              alt="Company Logo"
              className="h-8 object-contain hidden md:block rounded-md"
            />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 ring-2 ring-transparent transition-all hover:ring-primary">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair do sistema</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  )
}
