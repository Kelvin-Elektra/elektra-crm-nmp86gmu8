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
import type { ConfigurableField } from '@/services/templates'

interface Props {
  fields: ConfigurableField[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
}

export function ConfigurableFieldsForm({ fields, values, onChange }: Props) {
  if (!fields || fields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-4">
        Este template não possui campos configuráveis.
      </p>
    )
  }

  return (
    <div className="space-y-4 py-2 max-h-[50vh] overflow-y-auto pr-1">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label className="text-sm font-medium">{field.label}</Label>
          {renderField(field, values[field.key], (v) => onChange(field.key, v))}
        </div>
      ))}
    </div>
  )
}

function renderField(field: ConfigurableField, value: any, onChange: (v: any) => void) {
  switch (field.type) {
    case 'color':
      return (
        <div className="flex items-center gap-2">
          <Input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-16 h-10 p-1 cursor-pointer rounded-md border"
          />
          <Input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1"
            placeholder="#000000"
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
        />
      )
    case 'select':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione..." />
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
          value={value ?? 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )
    case 'boolean':
      return (
        <div className="flex items-center gap-2 pt-1">
          <Switch checked={!!value} onCheckedChange={onChange} />
          <span className="text-sm text-muted-foreground">{value ? 'Ativado' : 'Desativado'}</span>
        </div>
      )
    default:
      return (
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.default || ''}
        />
      )
  }
}
