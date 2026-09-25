export type SignaturePolicy = 'client_only' | 'client_rep' | 'client_rep_owner' | 'client_owner'

export interface SignerItem {
  id?: string
  name: string
  email: string
  phone?: string
  role: 'client' | 'representative' | 'owner' | 'other'
}

export interface BuildSignersParams {
  policy?: SignaturePolicy | string
  lead?: {
    name?: string
    email?: string
    phone?: string
  } | null
  representative?: {
    name?: string
    email?: string
    phone?: string
  } | null
  owner?: {
    name?: string
    email?: string
    phone?: string
  } | null
}

export const SIGNATURE_POLICY_LABELS: Record<SignaturePolicy, string> = {
  client_only: 'Apenas o Cliente',
  client_rep: 'Representante + Cliente',
  client_rep_owner: 'Representante + Cliente + Dono da Empresa',
  client_owner: 'Cliente + Dono da Empresa',
}

/**
 * Monta a lista padrão de signatários com base na política configurada na empresa.
 */
export function buildDefaultSigners(params: BuildSignersParams): SignerItem[] {
  const { policy = 'client_only', lead, representative, owner } = params
  const signers: SignerItem[] = []

  const clientSigner: SignerItem = {
    name: lead?.name || '',
    email: lead?.email || '',
    phone: lead?.phone || '',
    role: 'client',
  }

  const repSigner: SignerItem = {
    name: representative?.name || '',
    email: representative?.email || '',
    phone: representative?.phone || '',
    role: 'representative',
  }

  const ownerSigner: SignerItem = {
    name: owner?.name || '',
    email: owner?.email || '',
    phone: owner?.phone || '',
    role: 'owner',
  }

  switch (policy) {
    case 'client_rep':
      if (repSigner.name || repSigner.email) signers.push(repSigner)
      signers.push(clientSigner)
      break
    case 'client_rep_owner':
      if (repSigner.name || repSigner.email) signers.push(repSigner)
      signers.push(clientSigner)
      if (ownerSigner.name || ownerSigner.email) signers.push(ownerSigner)
      break
    case 'client_owner':
      signers.push(clientSigner)
      if (ownerSigner.name || ownerSigner.email) signers.push(ownerSigner)
      break
    case 'client_only':
    default:
      signers.push(clientSigner)
      break
  }

  return signers
}

export type SignatureStatus = 'enviado' | 'aguardando' | 'assinado' | 'recusado' | 'cancelado'

/**
 * Converte status ou eventos da Assinafy para o status padrão interno do Elektra CRM.
 */
export function mapAssinafyStatusToCrm(
  eventOrStatus: string,
  isFullySigned = false,
): SignatureStatus {
  if (!eventOrStatus) return 'aguardando'
  const norm = eventOrStatus.toLowerCase().trim()

  switch (norm) {
    // Eventos de webhook Assinafy
    case 'signer_signed_document':
      return isFullySigned ? 'assinado' : 'aguardando'
    case 'signer_rejected_document':
    case 'user_rejected_document':
    case 'rejected_by_signer':
    case 'rejected_by_user':
      return 'recusado'
    case 'document_processing_failed':
    case 'expired':
      return 'cancelado'
    case 'document_ready':
    case 'document_prepared':
    case 'signature_requested':
    case 'pending_signature':
      return 'aguardando'
    case 'document_uploaded':
    case 'uploading':
    case 'uploaded':
      return 'enviado'
    case 'certificated':
      return 'assinado'
    default:
      if (norm.includes('sign') && isFullySigned) return 'assinado'
      if (norm.includes('reject')) return 'recusado'
      if (norm.includes('fail') || norm.includes('cancel')) return 'cancelado'
      return 'aguardando'
  }
}
