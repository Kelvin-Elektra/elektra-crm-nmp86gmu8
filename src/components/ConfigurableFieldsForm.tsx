import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { TemplateSchemaField } from '@/services/templates'

interface Props {
  fields: TemplateSchemaField[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  errors?: Record<string, string>
}

export function ConfigurableFieldsForm({ fields, values, onChange, errors = {} }: Props) {
  if (!fields || fields.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-muted/40 border border-muted text-center space-y-1 my-2">
        <p className="text-sm font-medium text-foreground">
          Nenhum campo fixo para configurar neste modelo
        </p>
        <p className="text-xs text-muted-foreground">
          Você ainda pode visualizar a proposta normalmente clicando no botão "Visualizar".
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 py-2 max-h-[50vh] overflow-y-auto pr-1">
      {fields.map((field) => {
        const error = errors[field.key]
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1">
              <span>{field.label || field.key}</span>
              {field.required && <span className="text-destructive font-bold">*</span>}
            </Label>
            {renderField(field, values[field.key], (v) => onChange(field.key, v))}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )
      })}
    </div>
  )
}

function renderField(field: TemplateSchemaField, value: any, onChange: (v: any) => void) {
  switch (field.type) {
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <Input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-14 h-10 p-1 cursor-pointer rounded-md border shrink-0"
          />
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 font-mono uppercase"
            placeholder="#000000"
          />
        </div>
      )
    case 'image':
      return (
        <div className="space-y-2">
          {value ? (
            <div className="relative w-full h-28 bg-muted/20 border rounded-md flex items-center justify-center overflow-hidden p-2">
              <img
                src={value}
                alt={field.label || 'Preview'}
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  ;(e.target as HTMLElement).style.display = 'none'
                }}
              />
            </div>
          ) : null}
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.default || 'https://exemplo.com/logo.png'}
            required={field.required}
          />
        </div>
      )
    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={field.default || ''}
          required={field.required}
        />
      )
    case 'select':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma opção..." />
          </SelectTrigger>
          <SelectContent>
            {(field.options || []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case 'number':
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={field.default != null ? String(field.default) : ''}
          required={field.required}
        />
      )
    case 'boolean':
      return (
        <div className="flex items-center gap-2 pt-1">
          <Switch checked={!!value} onCheckedChange={onChange} />
          <span className="text-sm text-muted-foreground">{value ? 'Ativado' : 'Desativado'}</span>
        </div>
      )
    case 'text':
    default:
      return (
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.default || ''}
          required={field.required}
        />
      )
  }
}
