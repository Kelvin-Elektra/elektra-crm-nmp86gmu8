import { describe, it, expect, vi, beforeEach } from 'vitest'
import pb from '@/lib/pocketbase/client'
import { checkAuthStatus, resetAuthCheckCache } from '../auth-check'

describe('Auth Check Service', () => {
  beforeEach(() => {
    resetAuthCheckCache()
    vi.restoreAllMocks()
  })

  it('retorna não autorizado quando pb.authStore não possui token válido', async () => {
    // Simula authStore inválido
    vi.spyOn(pb.authStore, 'token', 'get').mockReturnValue('')
    vi.spyOn(pb.authStore, 'isValid', 'get').mockReturnValue(false)

    const result = await checkAuthStatus()
    expect(result.ok).toBe(false)
    expect(result.blocked).toBe(true)
    expect(result.reason).toBe('unauthorized')
  })

  it('caso 1: usuário e empresa ativos (200 OK)', async () => {
    vi.spyOn(pb.authStore, 'token', 'get').mockReturnValue('mock-valid-token')
    vi.spyOn(pb.authStore, 'isValid', 'get').mockReturnValue(true)

    const sendSpy = vi.spyOn(pb, 'send').mockResolvedValue({ ok: true })

    const result = await checkAuthStatus()

    expect(sendSpy).toHaveBeenCalledWith('/backend/v1/auth-check', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer mock-valid-token',
      },
    })
    expect(result.ok).toBe(true)
    expect(result.blocked).toBe(false)
  })

  it('caso 2: usuário inativo (403 { blocked: true, reason: "user" })', async () => {
    vi.spyOn(pb.authStore, 'token', 'get').mockReturnValue('mock-token-inactive-user')
    vi.spyOn(pb.authStore, 'isValid', 'get').mockReturnValue(true)

    vi.spyOn(pb, 'send').mockRejectedValue({
      status: 403,
      response: {
        status: 403,
        data: {
          blocked: true,
          reason: 'user',
          message: 'Usuário inativo.',
        },
      },
      data: {
        blocked: true,
        reason: 'user',
        message: 'Usuário inativo.',
      },
    })

    const result = await checkAuthStatus()

    expect(result.ok).toBe(false)
    expect(result.blocked).toBe(true)
    expect(result.reason).toBe('user')
  })

  it('caso 3: empresa inativa (403 { blocked: true, reason: "company" })', async () => {
    vi.spyOn(pb.authStore, 'token', 'get').mockReturnValue('mock-token-inactive-company')
    vi.spyOn(pb.authStore, 'isValid', 'get').mockReturnValue(true)

    vi.spyOn(pb, 'send').mockRejectedValue({
      status: 403,
      response: {
        status: 403,
        data: {
          blocked: true,
          reason: 'company',
          message: 'Empresa inativa.',
        },
      },
      data: {
        blocked: true,
        reason: 'company',
        message: 'Empresa inativa.',
      },
    })

    const result = await checkAuthStatus()

    expect(result.ok).toBe(false)
    expect(result.blocked).toBe(true)
    expect(result.reason).toBe('company')
  })

  it('caso 4: token inválido / 401', async () => {
    vi.spyOn(pb.authStore, 'token', 'get').mockReturnValue('mock-invalid-token')
    vi.spyOn(pb.authStore, 'isValid', 'get').mockReturnValue(true)

    vi.spyOn(pb, 'send').mockRejectedValue({
      status: 401,
      response: {
        status: 401,
        data: {
          blocked: true,
          reason: 'unauthorized',
          message: 'Não autenticado.',
        },
      },
    })

    const result = await checkAuthStatus()

    expect(result.ok).toBe(false)
    expect(result.blocked).toBe(true)
  })

  it('faz throttle e não dispara requisição repetida em menos de 5 segundos', async () => {
    vi.spyOn(pb.authStore, 'token', 'get').mockReturnValue('mock-valid-token')
    vi.spyOn(pb.authStore, 'isValid', 'get').mockReturnValue(true)

    const sendSpy = vi.spyOn(pb, 'send').mockResolvedValue({ ok: true })

    const res1 = await checkAuthStatus()
    expect(res1.ok).toBe(true)
    expect(sendSpy).toHaveBeenCalledTimes(1)

    // Segunda chamada imediata
    const res2 = await checkAuthStatus()
    expect(res2.ok).toBe(true)
    expect(sendSpy).toHaveBeenCalledTimes(1) // Continua 1

    // Com force = true, ignora throttle
    const res3 = await checkAuthStatus(true)
    expect(res3.ok).toBe(true)
    expect(sendSpy).toHaveBeenCalledTimes(2)
  })
})
