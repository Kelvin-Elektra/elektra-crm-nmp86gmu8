import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Columns3,
  Users,
  Briefcase,
  FileText,
  Settings,
  Sun,
  Zap,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

const navItems = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { title: 'Pipeline', path: '/pipeline', icon: Columns3 },
  { title: 'Leads', path: '/leads', icon: Users },
  { title: 'Negociações', path: '/negociacoes', icon: Briefcase },
  { title: 'Propostas', path: '/propostas', icon: FileText },
]

export function AppSidebar() {
  const location = useLocation()
  const { setOpen } = useSidebar()

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 shadow-2xl transition-all duration-300 md:mt-4 md:ml-4 md:mb-4 md:h-[calc(100vh-2rem)] md:rounded-2xl border border-sidebar-border overflow-hidden z-40 bg-sidebar"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border/50 p-0">
        <div className="flex items-center justify-center w-full h-full px-2 overflow-hidden">
          <div className="flex items-center gap-3 w-full px-1">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              <img
                src="https://img.usecurling.com/i?q=sun&shape=fill&color=white"
                alt="Logo da Empresa"
                className="h-full w-full object-cover"
              />
            </div>
            <span className="font-bold text-lg tracking-tight truncate group-data-[collapsible=icon]:hidden transition-opacity duration-200">
              Elektra CRM
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4 px-2 scrollbar-none">
        <SidebarGroup className="px-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path)
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="h-10 transition-all duration-200 w-full"
                    >
                      <Link to={item.path} className="flex items-center gap-3">
                        <item.icon className="!h-5 !w-5 shrink-0" />
                        <span className="font-medium group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === '/configuracoes-kit-pv'}
              tooltip="Configurações do Kit PV"
              className="h-10 w-full transition-all duration-200"
            >
              <Link to="/configuracoes-kit-pv" className="flex items-center gap-3">
                <Zap className="!h-5 !w-5 shrink-0" />
                <span className="font-medium group-data-[collapsible=icon]:hidden">
                  Configurações do Kit PV
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === '/configuracoes-proposta'}
              tooltip="Configurações da Proposta PV"
              className="h-10 w-full transition-all duration-200"
            >
              <Link to="/configuracoes-proposta" className="flex items-center gap-3">
                <FileText className="!h-5 !w-5 shrink-0" />
                <span className="font-medium group-data-[collapsible=icon]:hidden">
                  Configurações da Proposta PV
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === '/configuracoes'}
              tooltip="Configurações"
              className="h-10 w-full transition-all duration-200"
            >
              <Link to="/configuracoes" className="flex items-center gap-3">
                <Settings className="!h-5 !w-5 shrink-0" />
                <span className="font-medium group-data-[collapsible=icon]:hidden">
                  Configurações
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
