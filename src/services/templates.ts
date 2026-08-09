import pb from '@/lib/pocketbase/client'

export interface ConfigurableField {
  key: string
  type: string
  label?: string
  default?: any
}

export interface GeneratorTemplate {
  id: string
  name: string
  thumbnail?: string
  configurable_fields?: ConfigurableField[]
}

export const getTemplates = (): Promise<GeneratorTemplate[]> =>
  pb.send('/backend/v1/templates/list', { method: 'GET' })

export const previewTemplate = (
  templateId: string,
  data: Record<string, any>,
): Promise<{ view_url?: string; [key: string]: any }> =>
  pb.send(`/backend/v1/templates/${templateId}/preview`, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })
