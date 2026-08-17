import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import Layout from './components/Layout'
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
import { WhatsAppSupportButton } from './components/WhatsAppSupportButton'

type SsoState =
  | { status: 'loading'; detail?: string }
  | { status: 'success'; detail: string }
  | { status: 'error'; message: string; response?: unknown }

const SsoLoginScreen = ({ ssoToken }: { ssoToken: string }) => {
  const navigate = useNavigate()
  const [state, setState] = useState<SsoState>({
    status: 'loading',
    detail: 'Preparando requisição...',
  })
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    let cancelled = false
    const run = async () => {
      try {
        setState({ status: 'loading', detail: 'Enviando token para o backend...' })
        const res = await pb.send('/backend/v1/auth/sso', {
          method: 'POST',
          body: JSON.stringify({ sso_token: ssoToken }),
          headers: { 'Content-Type': 'application/json' },
        })

        if (cancelled) return

        if (!res || !res.token) {
          setState({
            status: 'error',
            message: 'Resposta inválida do servidor (token ausente).',
            response: res,
          })
          return
        }

        // Salva a sessão no authStore usando o registro retornado
        pb.authStore.save(res.token, res.record || res.user)
        setState({ status: 'success', detail: 'Acesso liberado! Redirecionando...' })

        // Pequeno delay para o feedback visual antes do redirect
        setTimeout(() => {
          if (!cancelled) navigate('/dashboard', { replace: true })
        }, 600)
      } catch (err: any) {
        if (cancelled) return
        const status = err?.status ?? err?.response?.status
        let message =
          err?.response?.message || err?.message || 'Falha inesperada ao validar o acesso via Hub.'
        // PocketBase costuma devolver 404/403 com message no body
        if (status === 404 && err?.response?.message) {
          message = err.response.message
        }
        setState({
          status: 'error',
          message,
          response: err?.response ?? err,
        })
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [ssoToken, navigate])

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 px-4 py-8">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
        <h1 className="text-xl font-semibold text-white mb-1">Acesso via Hub</h1>
        <p className="text-sm text-slate-400 mb-5">Verificando acesso via Hub...</p>

        {state.status === 'loading' && (
          <div className="flex items-center gap-3 text-slate-300">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-white" />
            <span className="text-sm">{state.detail}</span>
          </div>
        )}

        {state.status === 'success' && (
          <div className="flex items-center gap-3 text-emerald-400">
            <div className="h-4 w-4 rounded-full border-2 border-emerald-700 border-t-emerald-400 animate-spin" />
            <span className="text-sm">{state.detail}</span>
          </div>
        )}

        {state.status === 'error' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-900/60 bg-red-950/40 p-4">
              <p className="text-sm font-medium text-red-300">Erro ao autenticar</p>
              <p className="mt-1 text-sm text-red-200">{state.message}</p>
            </div>

            <details className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
              <summary className="cursor-pointer text-slate-300">Detalhes técnicos (debug)</summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-relaxed">
                {JSON.stringify(state.response ?? state, null, 2)}
              </pre>
            </details>

            <button
              onClick={() => navigate('/', { replace: true })}
              className="w-full rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-white"
            >
              Ir para login normal
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const RootRoute = () => {
  const { isAuthenticated } = useAuth()
  const ssoToken = new URLSearchParams(window.location.search).get('sso_token')

  // SSO: token presente na URL tem prioridade sobre o estado de auth atual
  if (ssoToken) return <SsoLoginScreen ssoToken={ssoToken} />

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
          <WhatsAppSupportButton />
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
