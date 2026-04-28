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
import { LogOut, User as UserIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
const DEFAULT_LOGO_URL = 'https://img.usecurling.com/i?q=elektra&color=azure'

const routeNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pipeline': 'Pipeline de Vendas',
  '/leads': 'Gestão de Leads',
  '/negociacoes': 'Negociações Ativas',
  '/propostas': 'Propostas Comerciais',
  '/configuracoes': 'Configurações',
}

export function AppHeader() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [companyLogo, setCompanyLogo] = useState<string>(DEFAULT_LOGO_URL)

  useEffect(() => {
    if (user?.company_id) {
      pb.collection('companies')
        .getOne(user.company_id)
        .then((record) => {
          if (record.logo) {
            setCompanyLogo(pb.files.getURL(record, record.logo))
          }
        })
        .catch(console.error)
    }
  }, [user?.company_id])

  useRealtime('companies', (e) => {
    if (e.record.id === user?.company_id) {
      if (e.record.logo) {
        setCompanyLogo(pb.files.getURL(e.record, e.record.logo))
      } else {
        setCompanyLogo(DEFAULT_LOGO_URL)
      }
    }
  })

  const title = routeNames[location.pathname] || 'Visão Geral'
  const initials = user?.name?.substring(0, 2).toUpperCase() || 'US'

  return (
    <header className="h-16 flex shrink-0 items-center justify-between border-b bg-background px-4 shadow-sm z-10 sticky top-0">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="-ml-2 md:hidden" />
        <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <img
          src={companyLogo}
          alt="Company Logo"
          className="h-8 object-contain hidden md:block rounded-md"
        />
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
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair do sistema</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
