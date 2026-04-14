import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import Leads from './pages/Leads'
import Negotiations from './pages/Negotiations'
import Proposals from './pages/Proposals'
import Settings from './pages/Settings'
import NegotiationDetail from './pages/NegotiationDetail'

const App = () => (
  <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/negociacoes" element={<Negotiations />} />
            <Route path="/negociacoes/:id" element={<NegotiationDetail />} />
            <Route path="/propostas" element={<Proposals />} />
            <Route path="/configuracoes" element={<Settings />} />
          </Route>
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
