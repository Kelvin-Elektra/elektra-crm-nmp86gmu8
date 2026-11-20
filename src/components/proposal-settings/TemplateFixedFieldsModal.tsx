import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import type { TemplateSchemaField } from '@/services/templates'

interface TemplateFixedFieldsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateName: string
  fields: TemplateSchemaField[]
  /** Config atual salva para este template (templates_config[templateId]). */
  currentConfig: Record<string, any>
  onSave: (values: Record<string, any>) => Promise<void> | void
}

function fieldLabel(f: TemplateSchemaField): string {
  if (f.label) return f.label
  const words = f.key.replace(/_/g, ' ').split(' ')
  return words.map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ')
}

export function TemplateFixedFieldsModal({
  open,
  onOpenChange,
  templateName,
  fields,
  currentConfig,
  onSave,
}: TemplateFixedFieldsModalProps) {
  const [values, setValues] = useState<Record<string, any>>({})
  const [saving, setSaving] = useState(false)

  // Recarrega os valores do config salvo sempre que o modal abre
  useEffect(() => {
    if (!open) return
    const next: Record<string, any> = {}
    for (const f of fields) {
      const v = currentConfig?.[f.key]
      if (v !== undefined && v !== null && typeof v !== 'object') {
        next[f.key] = String(v)
      } else if (typeof v === 'object' && v !== null) {
        next[f.key] = JSON.stringify(v, null, 2)
      } else {
        next[f.key] = ''
      }
    }
    setValues(next)
  }, [open, fields, currentConfig])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(values)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const setValue = (key: string, v: string) => setValues((prev) => ({ ...prev, [key]: v }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Campos fixos — {templateName}</DialogTitle>
          <DialogDescription>
            Estes valores são usados em todas as propostas geradas com este template (quando não
            houver dado do cliente para o campo).
          </DialogDescription>
        </DialogHeader>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Este template não possui campos fixos configuráveis.
          </p>
        ) : (
          <div className="grid gap-4 py-2">
            {fields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label htmlFor={`tplf-${f.key}`}>
                  {fieldLabel(f)}
                  {f.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                <Input
                  id={`tplf-${f.key}`}
                  value={values[f.key] ?? ''}
                  placeholder={
                    f.default !== undefined && f.default !== null ? String(f.default) : ''
                  }
                  onChange={(e) => setValue(f.key, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || fields.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
