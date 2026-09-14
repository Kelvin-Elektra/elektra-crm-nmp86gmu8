import React, { useRef, useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { RotateCcw, Upload, Loader2, Image as ImageIcon, Trash2, ExternalLink } from 'lucide-react'
import type { TemplateSchemaField } from '@/services/templates'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

interface Props {
  fields: TemplateSchemaField[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  errors?: Record<string, string>
  companyId?: string
  templateId?: string
  onResetField?: (key: string) => void
}

export function ConfigurableFieldsForm({
  fields,
  values,
  onChange,
  errors = {},
  companyId,
  templateId,
  onResetField,
}: Props) {
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

  // Filtrar apenas campos que podem ser configurados pelo usuário na UI
  // Campos tipo 'array' e 'object' complexos (como cronograma interno ou tabelas)
  // são manipulados via mock ou estruturas avançadas, mas se text/color/image/number/boolean/select, renderizam formulário
  const supportedFields = fields.filter((f) => !['array', 'object'].includes(f.type))

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 py-2 max-h-[55vh] overflow-y-auto pr-1">
        {supportedFields.map((field) => {
          const error = errors[field.key]
          const maxLength = field.max_length ?? field.maxLength ?? field.max
          const currentValue = values[field.key]
          const currentLength =
            typeof currentValue === 'string'
              ? currentValue.length
              : currentValue != null
                ? String(currentValue).length
                : 0

          return (
            <div
              key={field.key}
              className="space-y-1.5 p-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium flex items-center gap-1">
                  <span>{field.label || field.key}</span>
                  {field.required && <span className="text-destructive font-bold">*</span>}
                </Label>

                <div className="flex items-center gap-2">
                  {/* Contador de caracteres quando houver limite */}
                  {maxLength !== undefined && maxLength !== null && (
                    <span
                      className={`text-xs tabular-nums ${
                        currentLength >= maxLength
                          ? 'text-destructive font-semibold'
                          : currentLength > maxLength * 0.85
                            ? 'text-amber-600 font-medium'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {currentLength}/{maxLength}
                    </span>
                  )}

                  {/* Botão de restaurar individual */}
                  {field.default !== undefined && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            if (onResetField) {
                              onResetField(field.key)
                            } else {
                              onChange(field.key, field.default)
                            }
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="sr-only">Restaurar sugestão do sistema</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">Restaurar sugestão do sistema</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>

              {field.description && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
              )}

              {renderFieldInput(
                field,
                currentValue,
                (v) => onChange(field.key, v),
                maxLength,
                companyId,
                templateId,
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

function renderFieldInput(
  field: TemplateSchemaField,
  value: any,
  onChange: (v: any) => void,
  maxLength: number | undefined,
  companyId?: string,
  templateId?: string,
) {
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
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 font-mono uppercase"
            placeholder={field.default || '#000000'}
          />
        </div>
      )

    case 'image':
      return (
        <ImageFieldInput
          field={field}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          companyId={companyId}
          templateId={templateId}
        />
      )

    case 'textarea':
      return (
        <Textarea
          value={value || ''}
          maxLength={maxLength}
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
      // Se tiver max_length elevado (> 120) ou se a descrição sugerir texto longo, renderiza textarea
      if (maxLength && maxLength > 120) {
        return (
          <Textarea
            value={value || ''}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            rows={3}
            placeholder={field.default || ''}
            required={field.required}
          />
        )
      }
      return (
        <Input
          type="text"
          value={value || ''}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.default || ''}
          required={field.required}
        />
      )
  }
}

interface ImageFieldInputProps {
  field: TemplateSchemaField
  value: any
  onChange: (v: any) => void
  maxLength?: number
  companyId?: string
  templateId?: string
}

function ImageFieldInput({
  field,
  value,
  onChange,
  maxLength,
  companyId,
  templateId,
}: ImageFieldInputProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [imgError, setImgError] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!companyId) {
      toast({
        variant: 'destructive',
        title: 'Empresa não identificada',
        description: 'Não foi possível vincular o arquivo da empresa.',
      })
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('company_id', companyId)
      formData.append('file', file)
      formData.append('field_key', field.key)
      if (templateId) {
        formData.append('template_id', templateId)
      }

      const record = await pb.collection('template_assets').create(formData)
      const publicUrl = pb.files.getURL(record, record.file)
      onChange(publicUrl)
      setImgError(false)
      toast({
        title: 'Imagem carregada com sucesso',
        description: 'O arquivo foi salvo e a imagem foi vinculada.',
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Falha no upload',
        description: err?.message || 'Não foi possível enviar a imagem.',
      })
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative group border rounded-md p-2 bg-muted/20 flex flex-col items-center justify-center min-h-[110px] overflow-hidden">
          {!imgError ? (
            <img
              src={value}
              alt={field.label || 'Preview'}
              className="max-h-28 max-w-full object-contain rounded"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground text-xs p-4 gap-1">
              <ImageIcon className="h-6 w-6 opacity-40" />
              <span>Não foi possível carregar a prévia da imagem</span>
            </div>
          )}

          <div className="absolute top-1 right-1 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7 shadow-sm bg-white/90 hover:bg-white text-foreground"
              title="Abrir imagem em nova aba"
              onClick={() => window.open(value, '_blank')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-7 w-7 shadow-sm"
              title="Remover imagem"
              onClick={() => {
                onChange('')
                setImgError(false)
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {uploading ? 'Enviando...' : value ? 'Substituir por arquivo' : 'Fazer Upload'}
        </Button>
        <Input
          type="url"
          value={value || ''}
          maxLength={maxLength}
          onChange={(e) => {
            onChange(e.target.value)
            setImgError(false)
          }}
          placeholder={field.default || 'https://exemplo.com/imagem.png'}
          className="flex-1 text-xs font-mono"
          required={field.required}
        />
      </div>
    </div>
  )
}
