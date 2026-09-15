import pb from '@/lib/pocketbase/client'

export interface TemplateSchemaField {
  key: string
  type: 'text' | 'color' | 'image' | 'number' | 'boolean' | 'array' | 'object' | string
  label?: string
  required?: boolean
  default?: any
  options?: string[]
  max_length?: number
  maxLength?: number
  max?: number
  description?: string
  item_schema?: TemplateSchemaField[] | Record<string, TemplateSchemaField>
  items?:
    | TemplateSchemaField[]
    | Record<string, TemplateSchemaField>
    | { type?: string; properties?: Record<string, TemplateSchemaField> }
  properties?: Record<string, TemplateSchemaField>
}

export interface GeneratorTemplate {
  id: string
  name: string
  description?: string
  thumbnail?: string
  status?: string
  gradient?: string
  primary_color?: string
  secondary_color?: string
  variable_schema?: {
    fixed?: TemplateSchemaField[]
    dynamic?: TemplateSchemaField[]
    [key: string]: any
  }
  configurable_fields?: TemplateSchemaField[]
  mock_data?: Record<string, any>
}

export interface GeneratorContractEndpoint {
  endpoint: string
  method: string
  notes?: string
  idempotency_key?: string
  payload_shape?: string[]
  returns?: string[]
  body?: string[]
}

export interface GeneratorContract {
  auth?: string
  base_url?: string
  list_templates?: GeneratorContractEndpoint
  preview_proposal?: GeneratorContractEndpoint
  create_proposal?: GeneratorContractEndpoint
}

export interface TemplatesListResponse {
  contract: GeneratorContract | null
  templates: GeneratorTemplate[]
}

export interface CreateProposalPayload {
  template_id: string
  external_id: string
  fixed_data: Record<string, any>
  lead: Record<string, any>
  negotiation: Record<string, any>
  sizing: Record<string, any>
  financial: Record<string, any>
}

export interface CreateProposalResponse {
  success?: boolean
  view_url: string
  view_token?: string
  id?: string
  external_id?: string
  template_key?: string
  template_id?: string
  [key: string]: any
}

// Função utilitária para corrigir mojibake no frontend de forma defensiva
export function fixMojibakeString(str: string): string {
  if (!str || typeof str !== 'string') return str
  // Se contiver padrões de bytes UTF-8 lidos como ISO-8859-1 (ex: Ã§, Ã£, Â, etc.)
  if (/[\u00C2-\u00C3]/.test(str)) {
    try {
      return decodeURIComponent(escape(str))
    } catch {
      return str
    }
  }
  return str
}

export function sanitizeDeepMojibake<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') {
    return fixMojibakeString(obj) as unknown as T
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeDeepMojibake) as unknown as T
  }
  if (typeof obj === 'object') {
    const copy: any = {}
    for (const key of Object.keys(obj as any)) {
      copy[key] = sanitizeDeepMojibake((obj as any)[key])
    }
    return copy as T
  }
  return obj
}

export const getTemplatesResponse = async (): Promise<TemplatesListResponse> => {
  const rawData = await pb.send<any>('/backend/v1/templates/list', { method: 'GET' })
  const data = sanitizeDeepMojibake(rawData)
  if (Array.isArray(data)) {
    return {
      contract: null,
      templates: data,
    }
  }
  return {
    contract: data?.contract || null,
    templates: Array.isArray(data?.templates) ? data.templates : [],
  }
}

// Retrocompatibilidade para quem espera GeneratorTemplate[]
export const getTemplates = async (): Promise<GeneratorTemplate[]> => {
  const res = await getTemplatesResponse()
  return res.templates
}

export const previewTemplate = (
  templateId: string,
  fixedData: Record<string, any>,
  schemaFields?: TemplateSchemaField[],
  extraContext?: {
    lead?: Record<string, any>
    sizing?: Record<string, any>
    financial?: Record<string, any>
    negotiation?: Record<string, any>
  },
): Promise<{ view_url?: string; [key: string]: any }> => {
  let cleanedData = fixedData
  if (schemaFields && schemaFields.length > 0) {
    cleanedData = {}
    for (const f of schemaFields) {
      if (fixedData[f.key] !== undefined) {
        cleanedData[f.key] = fixedData[f.key]
      }
    }
  }

  return pb.send(`/backend/v1/templates/${templateId}/preview`, {
    method: 'POST',
    body: JSON.stringify({
      fixed_data: cleanedData,
      branding: cleanedData,
      ...(extraContext || {}),
    }),
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export const createGeneratorProposal = (
  payload: CreateProposalPayload,
  schemaFields?: TemplateSchemaField[],
): Promise<CreateProposalResponse> => {
  let cleanedFixedData = payload.fixed_data
  if (schemaFields && schemaFields.length > 0) {
    cleanedFixedData = {}
    for (const f of schemaFields) {
      if (payload.fixed_data[f.key] !== undefined) {
        cleanedFixedData[f.key] = payload.fixed_data[f.key]
      }
    }
  }

  return pb.send('/backend/v1/proposals/generate-external', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      fixed_data: cleanedFixedData,
    }),
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
