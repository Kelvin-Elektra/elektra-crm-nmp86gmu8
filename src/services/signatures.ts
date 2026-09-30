import pb from '@/lib/pocketbase/client'
import { SignerItem } from '@/lib/signature-utils'

export interface SignatureRequestRecord {
  id: string
  company_id: string
  negotiation_id: string
  proposal_id?: string
  contract_template_id?: string
  source: 'proposal' | 'upload' | 'contract' | 'power_of_attorney' | 'checklist'
  document_name: string
  status: 'enviado' | 'aguardando' | 'assinado' | 'recusado' | 'cancelado'
  signers: SignerItem[]
  assinafy_document_id?: string
  assinafy_signer_ids?: string[]
  original_pdf?: string
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
    contract_template_id?: any
  }
}

export interface SendSignaturePayload {
  negotiation_id: string
  proposal_id?: string
  contract_template_id?: string
  source: 'proposal' | 'upload' | 'contract' | 'power_of_attorney' | 'checklist'
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
      expand: 'proposal_id,contract_template_id',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar signature_requests:', err)
    return []
  }
}

/**
 * Retorna a URL direta de visualização/download para o arquivo original do documento.
 * Dá preferência ao arquivo original_pdf persistido no registro, depois à view_url da proposta.
 */
export function getOriginalDocumentUrl(record: SignatureRequestRecord): string | null {
  if (record.original_pdf) {
    return pb.files.getURL(record, record.original_pdf)
  }
  if (record.expand?.proposal_id?.view_url) {
    return record.expand.proposal_id.view_url
  }
  return null
}

/**
 * Retorna a URL do documento assinado (certificado).
 * Dá preferência ao arquivo assinado baixado no PocketBase (signed_pdf),
 * ou à URL externa certificada da plataforma caso o PDF físico ainda não tenha sido baixado.
 */
export function getSignedDocumentUrl(record: SignatureRequestRecord): string | null {
  if (record.signed_pdf) {
    return pb.files.getURL(record, record.signed_pdf)
  }
  // Se estiver marcado como assinado e o signing_url aponta para artefato ou página de certificado
  if (record.status === 'assinado' && record.signing_url) {
    return record.signing_url
  }
  return null
}

/**
 * Dispara o envio do documento e criação de solicitação de assinatura para a Assinafy via backend
 */
export interface SignatureIntegrationStatus {
  configured: boolean
  has_api_key: boolean
  has_account_id: boolean
  account_id?: string | null
  discovered_account_id?: boolean
  base_url: string
  is_sandbox: boolean
  webhook_url: string
  message: string
}

/**
 * Consulta o status da integração de assinatura digital no backend
 */
export async function getSignatureIntegrationStatus(): Promise<SignatureIntegrationStatus> {
  const token = pb.authStore.token
  const baseUrl = pb.baseUrl

  const res = await fetch(`${baseUrl}/backend/v1/signatures/status`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || 'Não foi possível verificar status da assinatura.')
  }

  return data
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
    if (data.code === 'ASSINAFY_NOT_CONFIGURED') {
      throw new Error(
        data.message || 'Integração de assinatura sendo finalizada. Fale com o suporte.',
      )
    }
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
