import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from './components/Layout'
import { Navigate } from 'react-router-dom'
import Portal from './pages/Portal'
import { SplashScreen } from './components/SplashScreen'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import ElektraAdminLogin from './pages/ElektraAdminLogin'
import ElektraAdminDashboard from './pages/ElektraAdminDashboard'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import Leads from './pages/Leads'
import Negotiations from './pages/Negotiations'
import Proposals from './pages/Proposals'
import Settings from './pages/Settings'
import NegotiationDetail from './pages/NegotiationDetail'
import ProposalSettings from './pages/ProposalSettings'
import PvKitSettings from './pages/PvKitSettings'

const RootRoute = () => {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return <Portal />
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <SplashScreen>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route path="/elektra-admin" element={<ElektraAdminLogin />} />
            <Route path="/elektra-admin/dashboard" element={<ElektraAdminDashboard />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pipeline" element={<Pipeline />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/negociacoes" element={<Negotiations />} />
              <Route path="/negociacoes/:id" element={<NegotiationDetail />} />
              <Route path="/propostas" element={<Proposals />} />
              <Route path="/configuracoes-kit-pv" element={<PvKitSettings />} />
              <Route path="/configuracoes-proposta" element={<ProposalSettings />} />
              <Route path="/configuracoes" element={<Settings />} />
            </Route>
          </Routes>
        </TooltipProvider>
      </SplashScreen>
    </AuthProvider>
  </BrowserRouter>
)

export default App
