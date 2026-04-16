import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Columns3, Users, Briefcase, FileText, Settings, Sun } from 'lucide-react'
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
      className="border-r-0 shadow-lg transition-all duration-300"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border/50 px-4">
        <div className="flex items-center gap-3 w-full overflow-hidden">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <Sun className="h-5 w-5 text-secondary" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-lg tracking-tight truncate group-data-[collapsible=icon]:hidden">
            Elektra CRM
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path)
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className="h-10 transition-all duration-200"
                    >
                      <Link to={item.path}>
                        <item.icon className="!h-5 !w-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location.pathname === '/configuracoes'}
              tooltip="Configurações"
            >
              <Link to="/configuracoes">
                <Settings className="!h-5 !w-5" />
                <span>Configurações</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
