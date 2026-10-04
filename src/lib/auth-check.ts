import pb from '@/lib/pocketbase/client'

export type AuthCheckResult = {
  ok: boolean
  blocked?: boolean
  reason?: 'user' | 'company' | 'unauthorized' | 'network'
  message?: string
}

let lastCheckTime = 0
let lastCheckResult: AuthCheckResult | null = null
let inFlightPromise: Promise<AuthCheckResult> | null = null

const THROTTLE_MS = 5000

/**
 * Reseta o cache de verificação (ex: ao fazer logout ou novo login)
 */
export function resetAuthCheckCache() {
  lastCheckTime = 0
  lastCheckResult = null
  inFlightPromise = null
}

/**
 * Verifica no backend se o usuário e a empresa vinculada continuam ativos.
 * Faz throttle de 5 segundos para evitar requisições redundantes em trocas de rota sequenciais.
 *
 * @param force Ignora o throttle e força uma nova verificação
 */
export async function checkAuthStatus(force = false): Promise<AuthCheckResult> {
  const token = pb.authStore.token
  if (!token || !pb.authStore.isValid) {
    return {
      ok: false,
      blocked: true,
      reason: 'unauthorized',
      message: 'Sessão inexistente ou expirada.',
    }
  }

  const now = Date.now()
  if (!force && lastCheckResult && now - lastCheckTime < THROTTLE_MS) {
    return lastCheckResult
  }

  if (inFlightPromise) {
    return inFlightPromise
  }

  inFlightPromise = (async () => {
    try {
      const res = await pb.send('/backend/v1/auth-check', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const result: AuthCheckResult = {
        ok: !!res?.ok,
        blocked: false,
      }
      lastCheckTime = Date.now()
      lastCheckResult = result
      return result
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status
      const data = err?.data || err?.response?.data || {}
      const reason = data.reason || (status === 401 ? 'unauthorized' : 'user')

      if (status === 401 || status === 403) {
        const result: AuthCheckResult = {
          ok: false,
          blocked: true,
          reason,
          message: data.message || 'Acesso desativado.',
        }
        lastCheckTime = Date.now()
        lastCheckResult = result
        return result
      }

      // Se for erro de rede / timeout ou 500 passageiro, não bloqueia agressivamente o usuário
      return {
        ok: false,
        blocked: false,
        reason: 'network',
        message: err?.message || 'Erro temporário de conexão.',
      }
    } finally {
      inFlightPromise = null
    }
  })()

  return inFlightPromise
}
