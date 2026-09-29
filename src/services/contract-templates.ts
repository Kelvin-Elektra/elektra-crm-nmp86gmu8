import pb from '@/lib/pocketbase/client'
import { extractPlaceholdersFromTemplate } from '@/lib/contract-resolver'

export type TemplateDocType = 'contract' | 'power_of_attorney' | 'checklist'

export type TemplateSignaturePolicy =
  | 'inherit'
  | 'client_only'
  | 'client_rep'
  | 'client_owner'
  | 'client_rep_owner'
  | 'rep_only'
  | 'owner_only'
  | 'rep_owner'

export interface ContractTemplateRecord {
  id: string
  company_id: string
  type?: TemplateDocType
  name: string
  description?: string
  content: string
  placeholders?: string[]
  active: boolean
  signature_policy?:
    | 'client_only'
    | 'client_rep'
    | 'client_owner'
    | 'client_rep_owner'
    | 'rep_only'
    | 'owner_only'
    | 'rep_owner'
    | ''
  created: string
  updated: string
}

export interface CreateContractTemplateInput {
  company_id: string
  type?: TemplateDocType
  name: string
  description?: string
  content: string
  active?: boolean
  signature_policy?:
    | 'client_only'
    | 'client_rep'
    | 'client_owner'
    | 'client_rep_owner'
    | 'rep_only'
    | 'owner_only'
    | 'rep_owner'
    | ''
}

export interface UpdateContractTemplateInput {
  type?: TemplateDocType
  name?: string
  description?: string
  content?: string
  active?: boolean
  signature_policy?:
    | 'client_only'
    | 'client_rep'
    | 'client_owner'
    | 'client_rep_owner'
    | 'rep_only'
    | 'owner_only'
    | 'rep_owner'
    | ''
}

/**
 * Busca todos os modelos de contrato da empresa
 */
export async function getContractTemplates(companyId?: string): Promise<ContractTemplateRecord[]> {
  try {
    let filter = ''
    if (companyId) {
      filter = `company_id = '${companyId}'`
    }
    const records = await pb.collection('contract_templates').getFullList<ContractTemplateRecord>({
      filter,
      sort: '-created',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar contract_templates:', err)
    return []
  }
}

/**
 * Busca modelos de contrato ativos para seleção na negociação
 */
export async function getActiveContractTemplates(
  companyId?: string,
  docType?: TemplateDocType,
): Promise<ContractTemplateRecord[]> {
  try {
    let filter = 'active = true'
    if (companyId) {
      filter += ` && company_id = '${companyId}'`
    }
    if (docType) {
      if (docType === 'contract') {
        filter += ` && (type = 'contract' || type = '' || type = null)`
      } else {
        filter += ` && type = '${docType}'`
      }
    }
    const records = await pb.collection('contract_templates').getFullList<ContractTemplateRecord>({
      filter,
      sort: 'name',
    })
    return records
  } catch (err) {
    console.error('Erro ao buscar active contract_templates:', err)
    return []
  }
}

/**
 * Envia um arquivo .docx para extração do texto no servidor via Skip Cloud Documents
 */
export async function extractDocxText(file: File): Promise<{ markdown: string; name: string }> {
  const formData = new FormData()
  formData.append('file', file)

  const data = await pb.send<{ markdown: string; name: string }>(
    '/backend/v1/documents/extract-text',
    {
      method: 'POST',
      body: formData,
    },
  )

  // Sanitização adicional no frontend para garantir apenas Markdown limpo sem tags residuais de Office/HTML cru
  let cleanMarkdown = data.markdown || ''
  if (cleanMarkdown) {
    cleanMarkdown = cleanMarkdown
      .replace(
        /<\/?(html|body|div|span|p|o:[a-z0-9_-]+|w:[a-z0-9_-]+|m:[a-z0-9_-]+|v:[a-z0-9_-]+)[^>]*>/gi,
        '',
      )
      .replace(/&nbsp;/gi, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  return {
    ...data,
    markdown: cleanMarkdown,
  }
}

/**
 * Cria um novo modelo de contrato
 */
export async function createContractTemplate(
  data: CreateContractTemplateInput,
): Promise<ContractTemplateRecord> {
  const placeholders = extractPlaceholdersFromTemplate(data.content)
  const payload = {
    ...data,
    placeholders,
    active: data.active ?? true,
  }
  const record = await pb.collection('contract_templates').create<ContractTemplateRecord>(payload)
  return record
}

/**
 * Atualiza um modelo existente
 */
export async function updateContractTemplate(
  id: string,
  data: UpdateContractTemplateInput,
): Promise<ContractTemplateRecord> {
  const payload: any = { ...data }
  if (data.content !== undefined) {
    payload.placeholders = extractPlaceholdersFromTemplate(data.content)
  }
  const record = await pb
    .collection('contract_templates')
    .update<ContractTemplateRecord>(id, payload)
  return record
}

/**
 * Exclui um modelo de contrato
 */
export async function deleteContractTemplate(id: string): Promise<boolean> {
  await pb.collection('contract_templates').delete(id)
  return true
}
