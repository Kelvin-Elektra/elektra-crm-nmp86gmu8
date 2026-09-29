export type SignaturePolicy =
  | 'inherit'
  | 'client_only'
  | 'client_rep'
  | 'client_rep_owner'
  | 'client_owner'
  | 'rep_only'
  | 'owner_only'
  | 'rep_owner'

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

export interface SignerCheckboxesState {
  client: boolean
  representative: boolean
  owner: boolean
}

/**
 * Converte o estado das 3 checkboxes para a chave de política ou null/'inherit' se nenhuma marcada.
 */
export function checkboxesToPolicy(state: SignerCheckboxesState): SignaturePolicy | 'inherit' {
  const { client, representative, owner } = state
  if (!client && !representative && !owner) return 'inherit'
  if (client && !representative && !owner) return 'client_only'
  if (client && representative && !owner) return 'client_rep'
  if (client && !representative && owner) return 'client_owner'
  if (client && representative && owner) return 'client_rep_owner'
  if (!client && representative && !owner) return 'rep_only'
  if (!client && !representative && owner) return 'owner_only'
  if (!client && representative && owner) return 'rep_owner'
  return 'inherit'
}

/**
 * Converte a chave da política salva no template para o estado das 3 checkboxes.
 */
export function policyToCheckboxes(policy?: string | null): SignerCheckboxesState {
  switch (policy) {
    case 'client_only':
      return { client: true, representative: false, owner: false }
    case 'client_rep':
      return { client: true, representative: true, owner: false }
    case 'client_owner':
      return { client: true, representative: false, owner: true }
    case 'client_rep_owner':
      return { client: true, representative: true, owner: true }
    case 'rep_only':
      return { client: false, representative: true, owner: false }
    case 'owner_only':
      return { client: false, representative: false, owner: true }
    case 'rep_owner':
      return { client: false, representative: true, owner: true }
    case 'inherit':
    case '':
    default:
      return { client: false, representative: false, owner: false }
  }
}

/**
 * Rótulo amigável em uma linha para o resumo do accordion ou exibição na tela.
 */
export function formatSignerSummary(
  policyOrState: string | null | undefined | SignerCheckboxesState,
): string {
  const state: SignerCheckboxesState =
    typeof policyOrState === 'object' && policyOrState !== null
      ? policyOrState
      : policyToCheckboxes(typeof policyOrState === 'string' ? policyOrState : undefined)

  const parts: string[] = []
  if (state.client) parts.push('Cliente')
  if (state.representative) parts.push('Representante')
  if (state.owner) parts.push('Dono da Empresa')

  if (parts.length === 0) {
    return 'Herdar da empresa'
  }
  return parts.join(' + ')
}

export const SIGNATURE_POLICY_LABELS: Record<SignaturePolicy, string> = {
  inherit: 'Herdar da empresa',
  client_only: 'Apenas o Cliente',
  client_rep: 'Cliente + Representante Comercial',
  client_rep_owner: 'Cliente + Representante + Dono da Empresa',
  client_owner: 'Cliente + Dono da Empresa',
  rep_only: 'Apenas o Representante',
  owner_only: 'Apenas o Dono da Empresa',
  rep_owner: 'Representante + Dono da Empresa',
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
    case 'rep_only':
      if (repSigner.name || repSigner.email) {
        signers.push(repSigner)
      } else {
        // Fallback de segurança se dados do representante estiverem vazios
        signers.push(clientSigner)
      }
      break
    case 'owner_only':
      if (ownerSigner.name || ownerSigner.email) {
        signers.push(ownerSigner)
      } else {
        // Fallback de segurança se dados do dono estiverem vazios
        signers.push(clientSigner)
      }
      break
    case 'rep_owner':
      if (repSigner.name || repSigner.email) signers.push(repSigner)
      if (ownerSigner.name || ownerSigner.email) signers.push(ownerSigner)
      if (signers.length === 0) signers.push(clientSigner)
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
