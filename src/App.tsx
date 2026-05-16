import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import { SsoGateway } from './components/SsoGateway'
import Layout from './components/Layout'
import Portal from './pages/Portal'
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

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SsoGateway>
          <Routes>
            <Route path="/" element={<Portal />} />
            <Route path="/elektra-admin" element={<ElektraAdminLogin />} />
            <Route path="/elektra-admin/dashboard" element={<ElektraAdminDashboard />} />
            <Route element={<Layout />}>
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
        </SsoGateway>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
