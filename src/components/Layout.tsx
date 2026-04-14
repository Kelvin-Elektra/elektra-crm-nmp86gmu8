import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { AppHeader } from '@/components/AppHeader'

export default function Layout() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user && location.pathname !== '/') {
    return <Navigate to="/" replace />
  }

  if (user && location.pathname === '/') {
    return <Navigate to="/dashboard" replace />
  }

  if (!user) {
    return <Outlet />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col flex-1 h-screen overflow-hidden bg-muted/30">
        <AppHeader />
        <main className="flex-1 overflow-auto p-4 md:p-8 animate-fade-in">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
