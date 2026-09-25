import pb from '@/lib/pocketbase/client'
import { extractPlaceholdersFromTemplate } from '@/lib/contract-resolver'

export interface ContractTemplateRecord {
  id: string
  company_id: string
  name: string
  description?: string
  content: string
  placeholders?: string[]
  active: boolean
  created: string
  updated: string
}

export interface CreateContractTemplateInput {
  company_id: string
  name: string
  description?: string
  content: string
  active?: boolean
}

export interface UpdateContractTemplateInput {
  name?: string
  description?: string
  content?: string
  active?: boolean
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
): Promise<ContractTemplateRecord[]> {
  try {
    let filter = 'active = true'
    if (companyId) {
      filter += ` && company_id = '${companyId}'`
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
