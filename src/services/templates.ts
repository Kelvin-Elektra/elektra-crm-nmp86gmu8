import pb from '@/lib/pocketbase/client'

export interface ConfigurableField {
  key: string
  label: string
  type: 'color' | 'text' | 'textarea' | 'select' | 'number' | 'boolean'
  default?: any
  options?: string[]
}

export interface GeneratorTemplate {
  id: string
  name: string
  thumbnail: string
  status: string
  configurable_fields: ConfigurableField[]
}

export const getTemplates = (): Promise<GeneratorTemplate[]> =>
  pb.send('/backend/v1/templates', { method: 'GET' })

export const previewTemplateUrl = (): string =>
  `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/templates/preview`
