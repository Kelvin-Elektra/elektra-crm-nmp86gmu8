import pb from '@/lib/pocketbase/client'

export interface FlowSyncResponse {
  success: boolean
  message: string
  flow_response?: any
  payload_sent?: any
}

export async function sendNegotiationToFlow(negotiationId: string): Promise<FlowSyncResponse> {
  const token = pb.authStore.token
  const baseUrl = pb.baseUrl || ''

  const res = await fetch(`${baseUrl}/backend/v1/flow-sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ negotiation_id: negotiationId }),
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const errorMsg =
      data.message || data.error || `Erro na comunicação com o Flow (código ${res.status}).`
    throw new Error(errorMsg)
  }

  return data
}
