import pb from '@/lib/pocketbase/client'

export interface TemplateSchemaField {
  key: string
  type: 'text' | 'color' | 'image' | string
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
  variable_schema?: {
    fixed?: TemplateSchemaField[]
    [key: string]: any
  }
  configurable_fields?: TemplateSchemaField[]
}

export const getTemplates = (): Promise<GeneratorTemplate[]> =>
  pb.send('/backend/v1/templates/list', { method: 'GET' })

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
