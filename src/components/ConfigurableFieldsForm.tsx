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
import {
  RotateCcw,
  Upload,
  Loader2,
  Image as ImageIcon,
  Trash2,
  ExternalLink,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
} from 'lucide-react'
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
      <div className="p-4 rounded-lg bg-muted/40 border border-muted text-center space-y-1 my-2 min-w-0 w-full">
        <p className="text-sm font-medium text-foreground">
          Nenhum campo fixo para configurar neste modelo
        </p>
        <p className="text-xs text-muted-foreground">
          Você ainda pode visualizar a proposta normalmente clicando no botão "Visualizar".
        </p>
      </div>
    )
  }

  // Todos os campos são suportados, inclusive listas dinâmicas (array)
  // Apenas campos de objeto sem subcampos são filtrados se houver
  const supportedFields = fields

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 py-2 max-h-[55vh] overflow-y-auto overflow-x-hidden pr-1 w-full min-w-0">
        {supportedFields.map((field) => {
          const error = errors[field.key]
          const maxLength = field.max_length ?? field.maxLength ?? field.max
          const currentValue = values[field.key]
          const currentLength =
            typeof currentValue === 'string'
              ? currentValue.length
              : currentValue != null && typeof currentValue !== 'object'
                ? String(currentValue).length
                : 0

          const isArrayField = field.type === 'array'

          return (
            <div
              key={field.key}
              className="space-y-2 p-3 rounded-lg border border-border/40 hover:border-border hover:bg-muted/20 transition-colors w-full min-w-0 overflow-hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 w-full min-w-0">
                <Label className="text-sm font-medium flex items-center gap-1 min-w-0 flex-1 truncate">
                  <span className="truncate">{field.label || field.key}</span>
                  {field.required && <span className="text-destructive font-bold shrink-0">*</span>}
                </Label>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Contador de caracteres quando houver limite em campos normais */}
                  {!isArrayField && maxLength !== undefined && maxLength !== null && (
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
                          className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                          onClick={() => {
                            if (onResetField) {
                              onResetField(field.key)
                            } else {
                              onChange(
                                field.key,
                                Array.isArray(field.default)
                                  ? JSON.parse(JSON.stringify(field.default))
                                  : field.default,
                              )
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
                <p className="text-xs text-muted-foreground break-words">{field.description}</p>
              )}

              <div className="w-full min-w-0">
                {isArrayField ? (
                  <ArrayFieldEditor
                    field={field}
                    value={Array.isArray(currentValue) ? currentValue : []}
                    onChange={(newArr) => onChange(field.key, newArr)}
                    companyId={companyId}
                    templateId={templateId}
                    onReset={() => {
                      if (onResetField) {
                        onResetField(field.key)
                      } else {
                        onChange(
                          field.key,
                          Array.isArray(field.default)
                            ? JSON.parse(JSON.stringify(field.default))
                            : [],
                        )
                      }
                    }}
                  />
                ) : (
                  renderFieldInput(
                    field,
                    currentValue,
                    (v) => onChange(field.key, v),
                    maxLength,
                    companyId,
                    templateId,
                  )
                )}
              </div>

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
        <div className="flex items-center gap-2 w-full min-w-0">
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
            className="flex-1 font-mono uppercase min-w-0"
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
          className="w-full min-w-0"
        />
      )

    case 'select':
      return (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger className="w-full min-w-0">
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
          className="w-full min-w-0"
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
            className="w-full min-w-0"
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
          className="w-full min-w-0"
        />
      )
  }
}

// -------------------------------------------------------------
// Componente de Edição Dinâmica de Listas (type: 'array')
// -------------------------------------------------------------
interface ArrayFieldEditorProps {
  field: TemplateSchemaField
  value: any[]
  onChange: (val: any[]) => void
  companyId?: string
  templateId?: string
  onReset: () => void
}

function extractItemSubfields(field: TemplateSchemaField): TemplateSchemaField[] {
  // 1. field.item_schema pode ser array de fields ou mapa { key: fieldDef }
  if (Array.isArray(field.item_schema) && field.item_schema.length > 0) {
    return field.item_schema
  }
  if (field.item_schema && typeof field.item_schema === 'object') {
    return Object.entries(field.item_schema).map(([key, def]: [string, any]) => ({
      key,
      ...(typeof def === 'object' ? def : { type: 'text', label: key }),
    }))
  }

  // 2. field.items pode ser array, objeto com properties (JSON Schema), ou mapa
  if (Array.isArray(field.items) && field.items.length > 0) {
    return field.items
  }
  if (field.items && typeof field.items === 'object') {
    const it = field.items as any
    if (it.properties && typeof it.properties === 'object') {
      return Object.entries(it.properties).map(([key, def]: [string, any]) => ({
        key,
        ...(typeof def === 'object' ? def : { type: 'text', label: key }),
      }))
    }
    if (!it.type || it.type === 'object') {
      const keys = Object.keys(it).filter((k) => k !== 'type')
      if (keys.length > 0) {
        return keys.map((key) => ({
          key,
          ...(typeof it[key] === 'object' ? it[key] : { type: 'text', label: key }),
        }))
      }
    }
  }

  // 3. field.properties diretamente no field
  if (field.properties && typeof field.properties === 'object') {
    return Object.entries(field.properties).map(([key, def]: [string, any]) => ({
      key,
      ...(typeof def === 'object' ? def : { type: 'text', label: key }),
    }))
  }

  // 4. Inferir do field.default se for array de objetos
  if (
    Array.isArray(field.default) &&
    field.default.length > 0 &&
    typeof field.default[0] === 'object' &&
    field.default[0] !== null
  ) {
    const sample = field.default[0]
    return Object.keys(sample).map((key) => {
      const val = sample[key]
      let inferredType = 'text'
      if (typeof val === 'number') inferredType = 'number'
      else if (typeof val === 'boolean') inferredType = 'boolean'
      else if (typeof val === 'string') {
        if (/^#(?:[0-9a-fA-F]{3}){1,2}$/.test(val)) inferredType = 'color'
        else if (key.toLowerCase().includes('cor') || key.toLowerCase().includes('color'))
          inferredType = 'color'
        else if (
          key.toLowerCase().includes('img') ||
          key.toLowerCase().includes('image') ||
          key.toLowerCase().includes('icone') ||
          key.toLowerCase().includes('icon') ||
          key.toLowerCase().includes('foto')
        )
          inferredType = 'image'
      }
      return {
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        type: inferredType,
        default: val,
      }
    })
  }

  // Fallback padrão se for array de strings primitivas
  return [{ key: 'value', label: 'Item', type: 'text' }]
}

function ArrayFieldEditor({
  field,
  value,
  onChange,
  companyId,
  templateId,
  onReset,
}: ArrayFieldEditorProps) {
  const subfields = extractItemSubfields(field)
  const isPrimitiveArray =
    subfields.length === 1 &&
    subfields[0].key === 'value' &&
    (field.default === undefined ||
      (Array.isArray(field.default) && typeof field.default[0] === 'string'))

  // Criar template de um novo item
  const createEmptyItem = () => {
    // Se existir default no schema com pelo menos 1 item, usa cópia estrutural do primeiro
    if (
      Array.isArray(field.default) &&
      field.default.length > 0 &&
      typeof field.default[0] === 'object'
    ) {
      const empty: Record<string, any> = {}
      for (const sf of subfields) {
        empty[sf.key] = ''
      }
      return empty
    }
    if (isPrimitiveArray) {
      return ''
    }
    const empty: Record<string, any> = {}
    for (const sf of subfields) {
      empty[sf.key] = sf.default !== undefined ? sf.default : ''
    }
    return empty
  }

  const handleAddItem = () => {
    const newItem = createEmptyItem()
    onChange([...value, newItem])
  }

  const handleRemoveItem = (index: number) => {
    const updated = value.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...value]
    const temp = updated[index - 1]
    updated[index - 1] = updated[index]
    updated[index] = temp
    onChange(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index >= value.length - 1) return
    const updated = [...value]
    const temp = updated[index + 1]
    updated[index + 1] = updated[index]
    updated[index] = temp
    onChange(updated)
  }

  const handleSubfieldChange = (index: number, subKey: string, subVal: any) => {
    const updated = [...value]
    if (isPrimitiveArray) {
      updated[index] = subVal
    } else {
      const currentItem =
        typeof updated[index] === 'object' && updated[index] !== null ? updated[index] : {}
      updated[index] = {
        ...currentItem,
        [subKey]: subVal,
      }
    }
    onChange(updated)
  }

  return (
    <div className="space-y-3 w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2 rounded-md border text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
          <Layers className="h-3.5 w-3.5" />
          <span>
            {value.length} {value.length === 1 ? 'item configurado' : 'itens configurados'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {field.default !== undefined && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={onReset}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Restaurar sugestão do sistema
            </Button>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 text-xs"
            onClick={handleAddItem}
          >
            <Plus className="h-3 w-3 mr-1" />
            Adicionar item
          </Button>
        </div>
      </div>

      {value.length === 0 ? (
        <div className="text-center p-4 border border-dashed rounded-md bg-muted/10 text-xs text-muted-foreground space-y-2">
          <p>Nenhum item adicionado a esta lista.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleAddItem}
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar primeiro item
          </Button>
        </div>
      ) : (
        <div className="space-y-2 w-full min-w-0">
          {value.map((item, index) => {
            return (
              <div
                key={index}
                className="p-3 border rounded-lg bg-card/60 hover:bg-card space-y-2 transition-colors w-full min-w-0 shadow-sm"
              >
                {/* Header do item */}
                <div className="flex items-center justify-between gap-2 border-b pb-2 text-xs">
                  <span className="font-semibold text-muted-foreground">#{index + 1}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      title="Subir"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      disabled={index >= value.length - 1}
                      onClick={() => handleMoveDown(index)}
                      title="Descer"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveItem(index)}
                      title="Remover item"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Subcampos do item */}
                <div className="space-y-2 pt-1 w-full min-w-0">
                  {isPrimitiveArray ? (
                    <div className="space-y-1 w-full min-w-0">
                      <Input
                        type="text"
                        value={item || ''}
                        onChange={(e) => handleSubfieldChange(index, 'value', e.target.value)}
                        placeholder="Texto do item..."
                        className="text-xs w-full min-w-0"
                      />
                    </div>
                  ) : (
                    subfields.map((subfield) => {
                      const itemVal = item && typeof item === 'object' ? item[subfield.key] : ''
                      const subMax = subfield.max_length ?? subfield.maxLength ?? subfield.max
                      const subLen =
                        typeof itemVal === 'string'
                          ? itemVal.length
                          : itemVal != null
                            ? String(itemVal).length
                            : 0

                      return (
                        <div key={subfield.key} className="space-y-1 w-full min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <Label className="text-xs font-medium text-muted-foreground truncate">
                              {subfield.label || subfield.key}
                              {subfield.required && (
                                <span className="text-destructive ml-0.5">*</span>
                              )}
                            </Label>
                            {subMax !== undefined && subMax !== null && (
                              <span
                                className={`text-[10px] tabular-nums ${
                                  subLen >= subMax
                                    ? 'text-destructive font-semibold'
                                    : 'text-muted-foreground'
                                }`}
                              >
                                {subLen}/{subMax}
                              </span>
                            )}
                          </div>

                          <div className="w-full min-w-0">
                            {renderSubfieldInput(
                              subfield,
                              itemVal,
                              (newVal) => handleSubfieldChange(index, subfield.key, newVal),
                              subMax,
                              companyId,
                              templateId,
                            )}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function renderSubfieldInput(
  subfield: TemplateSchemaField,
  value: any,
  onChange: (val: any) => void,
  maxLength: number | undefined,
  companyId?: string,
  templateId?: string,
) {
  switch (subfield.type) {
    case 'color':
      return (
        <div className="flex items-center gap-2 w-full min-w-0">
          <Input
            type="color"
            value={value || '#000000'}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-8 p-1 cursor-pointer rounded border shrink-0"
          />
          <Input
            type="text"
            value={value || ''}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 font-mono uppercase text-xs h-8 min-w-0"
            placeholder={subfield.default || '#000000'}
          />
        </div>
      )

    case 'image':
      return (
        <ImageFieldInput
          field={subfield}
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
          rows={2}
          placeholder={subfield.default || ''}
          className="text-xs w-full min-w-0"
        />
      )

    case 'number':
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          placeholder={subfield.default != null ? String(subfield.default) : ''}
          className="text-xs h-8 w-full min-w-0"
        />
      )

    case 'boolean':
      return (
        <div className="flex items-center gap-2 pt-0.5">
          <Switch checked={!!value} onCheckedChange={onChange} />
          <span className="text-xs text-muted-foreground">{value ? 'Ativado' : 'Desativado'}</span>
        </div>
      )

    case 'text':
    default:
      if (maxLength && maxLength > 120) {
        return (
          <Textarea
            value={value || ''}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            placeholder={subfield.default || ''}
            className="text-xs w-full min-w-0"
          />
        )
      }
      return (
        <Input
          type="text"
          value={value || ''}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          placeholder={subfield.default || ''}
          className="text-xs h-8 w-full min-w-0"
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
    <div className="space-y-2 w-full min-w-0">
      {value ? (
        <div className="relative group border rounded-md p-2 bg-muted/20 flex flex-col items-center justify-center min-h-[100px] overflow-hidden w-full min-w-0">
          {!imgError ? (
            <img
              src={value}
              alt={field.label || 'Preview'}
              className="max-h-24 max-w-full object-contain rounded"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-muted-foreground text-xs p-3 gap-1">
              <ImageIcon className="h-5 w-5 opacity-40" />
              <span>Não foi possível carregar a prévia</span>
            </div>
          )}

          <div className="absolute top-1 right-1 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-6 w-6 shadow-sm bg-white/90 hover:bg-white text-foreground"
              title="Abrir imagem em nova aba"
              onClick={() => window.open(value, '_blank')}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-6 w-6 shadow-sm"
              title="Remover imagem"
              onClick={() => {
                onChange('')
                setImgError(false)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full min-w-0">
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
          className="shrink-0 text-xs h-8"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5 mr-1.5" />
          )}
          {uploading ? 'Enviando...' : value ? 'Substituir' : 'Upload'}
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
          className="flex-1 text-xs font-mono h-8 min-w-0"
          required={field.required}
        />
      </div>
    </div>
  )
}
