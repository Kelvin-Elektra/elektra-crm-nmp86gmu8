import pb from '@/lib/pocketbase/client'

export interface TemplateSchemaField {
  key: string
  type: 'text' | 'color' | 'image' | 'number' | 'boolean' | 'array' | 'object' | string
  label?: string
  required?: boolean
  default?: any
  options?: string[]
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

export const getTemplatesResponse = async (): Promise<TemplatesListResponse> => {
  const data = await pb.send<any>('/backend/v1/templates/list', { method: 'GET' })
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
): Promise<{ view_url?: string; [key: string]: any }> =>
  pb.send(`/backend/v1/templates/${templateId}/preview`, {
    method: 'POST',
    body: JSON.stringify({
      fixed_data: fixedData,
      branding: fixedData,
    }),
    headers: { 'Content-Type': 'application/json' },
  })

export const createGeneratorProposal = (
  payload: CreateProposalPayload,
): Promise<CreateProposalResponse> =>
  pb.send('/backend/v1/proposals/generate-external', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })
