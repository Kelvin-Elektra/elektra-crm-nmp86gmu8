import pb from '@/lib/pocketbase/client'
import { SignerItem } from '@/lib/signature-utils'

export interface SignatureRequestRecord {
  id: string
  company_id: string
  negotiation_id: string
  proposal_id?: string
  source: 'proposal' | 'upload'
  document_name: string
  status: 'enviado' | 'aguardando' | 'assinado' | 'recusado' | 'cancelado'
  signers: SignerItem[]
  assinafy_document_id?: string
  assinafy_signer_ids?: string[]
  signed_pdf?: string
  sent_at?: string
  signed_at?: string
  signing_url?: string
  error_message?: string
  created: string
  updated: string
  expand?: {
    proposal_id?: any
    negotiation_id?: any
  }
}

export interface SendSignaturePayload {
  negotiation_id: string
  proposal_id?: string
  source: 'proposal' | 'upload'
  document_name: string
  signers: SignerItem[]
  pdf_base64?: string
  pdf_url?: string
}

/**
 * Busca todas as solicitações de assinatura de uma negociação
 */
export async function getSignatureRequestsByNegotiation(
  negotiationId: string,
): Promise<SignatureRequestRecord[]> {
  try {
    const records = await pb.collection('signature_requests').getFullList<SignatureRequestRecord>({
      filter: `negotiation_id = '${negotiationId}'`,
      sort: '-created',
      expand: 'proposal_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar signature_requests:', err)
    return []
  }
}

/**
 * Dispara o envio do documento e criação de solicitação de assinatura para a Assinafy via backend
 */
export async function sendSignatureRequest(
  payload: SendSignaturePayload,
): Promise<{ success: boolean; record: SignatureRequestRecord; signing_url?: string }> {
  const token = pb.authStore.token
  const baseUrl = pb.baseUrl

  const res = await fetch(`${baseUrl}/backend/v1/signatures/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Falha ao enviar documento para assinatura.')
  }

  return data
}

/**
 * Sincroniza o status do documento com a Assinafy
 */
export async function syncSignatureStatus(
  signatureRequestId: string,
): Promise<SignatureRequestRecord> {
  const token = pb.authStore.token
  const baseUrl = pb.baseUrl

  const res = await fetch(`${baseUrl}/backend/v1/signatures/sync/${signatureRequestId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Falha ao sincronizar status do documento.')
  }

  return data.record
}
