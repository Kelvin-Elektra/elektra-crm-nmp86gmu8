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
import { Loader2 } from 'lucide-react'
import { ConfigurableFieldsForm } from '@/components/ConfigurableFieldsForm'
import type { TemplateSchemaField } from '@/services/templates'

interface TemplateFixedFieldsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateName: string
  fields: TemplateSchemaField[]
  /** Config atual salva para este template (templates_config[templateId]). */
  currentConfig: Record<string, any>
  /** id da companhia — necessário para o upload de imagens (template_assets). */
  companyId?: string
  /** id do template — usado para vincular o asset enviado ao template. */
  templateId?: string
  onSave: (values: Record<string, any>) => Promise<void> | void
}

export function TemplateFixedFieldsModal({
  open,
  onOpenChange,
  templateName,
  fields,
  currentConfig,
  companyId,
  templateId,
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
      if (v === undefined || v === null) {
        // Sem valor salvo: parte do default do schema (mantém o tipo original)
        next[f.key] =
          f.default !== undefined && f.default !== null
            ? Array.isArray(f.default)
              ? JSON.parse(JSON.stringify(f.default))
              : typeof f.default === 'object'
                ? JSON.parse(JSON.stringify(f.default))
                : f.default
            : ''
      } else {
        next[f.key] = v
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

  const handleChange = (key: string, v: any) => {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* max-h + overflow-hidden anulam o scroll externo do DialogContent base
          (overflow-y-auto max-h-screen): o único scroll é o interno do form. */}
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Campos fixos — {templateName}</DialogTitle>
          <DialogDescription>
            Estes valores são usados em todas as propostas geradas com este template (quando não
            houver dado do cliente para o campo).
          </DialogDescription>
        </DialogHeader>

        <ConfigurableFieldsForm
          fields={fields}
          values={values}
          onChange={handleChange}
          companyId={companyId}
          templateId={templateId}
        />

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
