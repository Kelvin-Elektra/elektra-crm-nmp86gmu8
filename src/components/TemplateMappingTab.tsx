import React, { useState, useMemo } from 'react'
import { GeneratorTemplate } from '@/services/templates'
import {
  CRM_FIELD_SECTIONS,
  evaluateDynamicFieldStatus,
  DynamicFieldStatus,
} from '@/lib/dynamic-mapping'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Eye,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  FileCheck2,
  ExternalLink,
  Loader2,
  Filter,
} from 'lucide-react'

interface TemplateMappingTabProps {
  templates: GeneratorTemplate[]
  templatesLoading: boolean
  activeCompanyId: string
  companies: any[]
  dynamicMappings: Record<string, Record<string, string>>
  sampleNegotiationData: any
  onSaveMappings: (templateId: string, mappings: Record<string, string>) => Promise<void>
  onPreviewTemplate: (
    template: GeneratorTemplate,
    customMappings?: Record<string, string>,
  ) => Promise<void>
  previewLoading: boolean
  saving: boolean
}

export const TemplateMappingTab: React.FC<TemplateMappingTabProps> = ({
  templates,
  templatesLoading,
  activeCompanyId,
  companies,
  dynamicMappings,
  sampleNegotiationData,
  onSaveMappings,
  onPreviewTemplate,
  previewLoading,
  saving,
}) => {
  // Template selecionado
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    return templates[0]?.id || ''
  })

  // Se o selecionado ainda estiver vazio e carregou templates
  React.useEffect(() => {
    if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id)
    }
  }, [templates, selectedTemplateId])

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0] || null
  }, [templates, selectedTemplateId])

  // Rascunho local de mapeamento para o template selecionado: { [key_campo_gerador]: "caminho.campo.crm" }
  const [localMappings, setLocalMappings] = useState<Record<string, Record<string, string>>>(
    dynamicMappings || {},
  )

  // Sincronizar quando dynamicMappings mudar externamente
  React.useEffect(() => {
    setLocalMappings(dynamicMappings || {})
  }, [dynamicMappings])

  // Filtros de busca e status
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | DynamicFieldStatus>('all')

  // Obter schema dinâmico do template selecionado
  const dynamicFieldsList = useMemo(() => {
    if (!selectedTemplate?.variable_schema?.dynamic) return []
    const schema = selectedTemplate.variable_schema.dynamic
    if (Array.isArray(schema)) {
      return schema
        .map((f: any) => {
          if (typeof f === 'string') return { key: f, label: f, type: 'text', required: false }
          return {
            key: f.key || f.name || '',
            label: f.label || f.key || f.name || '',
            type: f.type || 'text',
            required: !!f.required,
            default: f.default,
            description: f.description,
          }
        })
        .filter((f) => !!f.key)
    }
    if (typeof schema === 'object') {
      return Object.entries(schema).map(([key, val]: [string, any]) => {
        if (typeof val === 'string') return { key, label: val, type: 'text', required: false }
        return {
          key,
          label: val?.label || key,
          type: val?.type || 'text',
          required: !!val?.required,
          default: val?.default,
          description: val?.description,
        }
      })
    }
    return []
  }, [selectedTemplate])

  // Obter mappings do template atual
  const currentTemplateMappings = useMemo(() => {
    if (!selectedTemplate) return {}
    return localMappings[selectedTemplate.id] || {}
  }, [localMappings, selectedTemplate])

  // Avaliar status de cada variável
  const evaluatedFields = useMemo(() => {
    return dynamicFieldsList.map((f) => {
      const manual = currentTemplateMappings[f.key]
      return evaluateDynamicFieldStatus(f.key, f, manual, sampleNegotiationData)
    })
  }, [dynamicFieldsList, currentTemplateMappings, sampleNegotiationData])

  // Métricas de resumo no topo
  const summary = useMemo(() => {
    const total = evaluatedFields.length
    const manual = evaluatedFields.filter((f) => f.status === 'manual').length
    const auto = evaluatedFields.filter((f) => f.status === 'auto').length
    const empty = evaluatedFields.filter((f) => f.status === 'empty').length
    const unmapped = evaluatedFields.filter((f) => f.status === 'unmapped').length
    const mapped = manual + auto
    const attention = empty + unmapped
    return { total, mapped, manual, auto, empty, unmapped, attention }
  }, [evaluatedFields])

  // Filtro por texto e por status
  const filteredFields = useMemo(() => {
    return evaluatedFields.filter((field) => {
      if (statusFilter !== 'all' && field.status !== statusFilter) {
        return false
      }
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        field.key.toLowerCase().includes(q) ||
        field.label.toLowerCase().includes(q) ||
        field.type.toLowerCase().includes(q) ||
        (field.effectivePath && field.effectivePath.toLowerCase().includes(q))
      )
    })
  }, [evaluatedFields, searchQuery, statusFilter])

  // Manipulação de mudança de dropdown
  const handleFieldChange = (key: string, value: string) => {
    if (!selectedTemplate) return
    const templateId = selectedTemplate.id

    setLocalMappings((prev) => {
      const prevForTpl = { ...(prev[templateId] || {}) }
      if (value === '__auto__' || value === '') {
        delete prevForTpl[key]
      } else {
        prevForTpl[key] = value
      }
      return {
        ...prev,
        [templateId]: prevForTpl,
      }
    })
  }

  // Restaurar todos os campos do template para automático
  const handleResetAllToAuto = () => {
    if (!selectedTemplate) return
    const templateId = selectedTemplate.id
    setLocalMappings((prev) => {
      const next = { ...prev }
      delete next[templateId]
      return next
    })
  }

  // Salvar mapeamento no banco
  const handleSave = async () => {
    if (!selectedTemplate) return
    await onSaveMappings(selectedTemplate.id, currentTemplateMappings)
  }

  // Visualizar template chamando endpoint de preview
  const handlePreview = async () => {
    if (!selectedTemplate) return
    await onPreviewTemplate(selectedTemplate, currentTemplateMappings)
  }

  const renderBadge = (status: DynamicFieldStatus) => {
    switch (status) {
      case 'auto':
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 gap-1 font-medium"
          >
            <Sparkles className="w-3 h-3 text-blue-600" /> Auto-mapeada
          </Badge>
        )
      case 'manual':
        return (
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-medium"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Manual
          </Badge>
        )
      case 'empty':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 text-amber-700 border-amber-300 gap-1 font-medium"
          >
            <AlertTriangle className="w-3 h-3 text-amber-600" /> Sem valor no CRM
          </Badge>
        )
      case 'unmapped':
      default:
        return (
          <Badge
            variant="outline"
            className="bg-rose-50 text-rose-700 border-rose-300 gap-1 font-medium"
          >
            <HelpCircle className="w-3 h-3 text-rose-600" /> Não mapeada
          </Badge>
        )
    }
  }

  const activeCompanyName = useMemo(() => {
    if (!activeCompanyId || activeCompanyId === 'all') return 'Todas as Empresas (Padrão)'
    const c = companies.find((comp) => comp.id === activeCompanyId)
    return c?.name || 'Empresa Selecionada'
  }, [activeCompanyId, companies])

  return (
    <div className="space-y-6">
      {/* Cabeçalho explicativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">
              Mapeamento Manual de Variáveis Dinâmicas
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Configure de qual campo da negociação/proposta o Gerador extrairá cada variável
            dinâmica. O override manual tem prioridade; variáveis sem override utilizam o mapeador
            semântico automático.
          </p>
          <div className="pt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Empresa de aplicação:</span>
            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium">
              {activeCompanyName}
            </span>
          </div>
        </div>

        {/* Ações principais */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={previewLoading || !selectedTemplate}
            className="gap-2"
          >
            {previewLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 text-blue-600" />
            )}
            Visualizar Preview
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !selectedTemplate}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Mapeamento
          </Button>
        </div>
      </div>

      {/* Seletor de Template e Resumo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seletor do Template */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Selecione o Modelo</span>
              {templatesLoading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </CardTitle>
            <CardDescription>
              Templates disponíveis retornados pelo Gerador de Propostas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={templatesLoading || templates.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha um modelo..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="font-medium">{tpl.name}</span>
                      {tpl.status && (
                        <span className="text-xs text-muted-foreground uppercase">
                          ({tpl.status})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedTemplate && (
              <div className="p-3 bg-slate-50 border rounded-lg text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">ID Técnico:</span>
                  <code className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">
                    {selectedTemplate.id}
                  </code>
                </div>
                {selectedTemplate.description && (
                  <p className="text-slate-600 italic border-t pt-2">
                    {selectedTemplate.description}
                  </p>
                )}
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-slate-500">Status no Gerador:</span>
                  <Badge variant="outline" className="capitalize text-xs font-normal">
                    {selectedTemplate.status || 'Ativo'}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo do Mapeamento */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Diagnóstico de Mapeamento</CardTitle>
                <CardDescription>
                  {summary.mapped} de {summary.total} variáveis mapeadas ·{' '}
                  <span
                    className={
                      summary.attention > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600'
                    }
                  >
                    {summary.attention} aguardando atenção
                  </span>
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetAllToAuto}
                className="text-xs text-slate-600 hover:text-slate-900 gap-1 self-start sm:self-auto"
                title="Restaura todas as variáveis para a sugestão do mapeador semântico automático"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Restaurar Todos para Automático
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                onClick={() => setStatusFilter(statusFilter === 'manual' ? 'all' : 'manual')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  statusFilter === 'manual'
                    ? 'ring-2 ring-emerald-500 bg-emerald-50'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Manual</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.manual}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Definidas pelo ADM</div>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === 'auto' ? 'all' : 'auto')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  statusFilter === 'auto'
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Auto-mapeadas</span>
                  <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-700 mt-1">{summary.auto}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Mapeador Semântico</div>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === 'empty' ? 'all' : 'empty')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  statusFilter === 'empty'
                    ? 'ring-2 ring-amber-500 bg-amber-50'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Sem Valor</span>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-amber-700 mt-1">{summary.empty}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Vazias no CRM</div>
              </div>

              <div
                onClick={() => setStatusFilter(statusFilter === 'unmapped' ? 'all' : 'unmapped')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  statusFilter === 'unmapped'
                    ? 'ring-2 ring-rose-500 bg-rose-50'
                    : 'bg-white hover:bg-slate-50'
                }`}
              >
                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Não Mapeadas</span>
                  <HelpCircle className="h-3.5 w-3.5 text-rose-600" />
                </div>
                <div className="text-2xl font-bold text-rose-700 mt-1">{summary.unmapped}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Sem correspondência</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Mapeamento */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-slate-700" />
                <span>
                  Variáveis Dinâmicas do Template ({filteredFields.length} de{' '}
                  {evaluatedFields.length})
                </span>
              </CardTitle>
              <CardDescription>
                Compare as variáveis esperadas pelo Gerador com a fonte correspondente no CRM
              </CardDescription>
            </div>

            {/* Barra de Pesquisa e Filtro de Status */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Filtrar por nome ou chave..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>

              {statusFilter !== 'all' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="h-9 text-xs gap-1"
                >
                  <Filter className="h-3 w-3" /> Limpar filtro ({statusFilter})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 w-[42%]">
                    <span>O que o Gerador espera</span>
                    <span className="block text-[10px] font-normal text-slate-500">
                      Chave técnica, nome descritivo e tipo
                    </span>
                  </th>
                  <th className="py-3 px-4 w-[58%]">
                    <span>O que o CRM envia</span>
                    <span className="block text-[10px] font-normal text-slate-500">
                      Origem do dado na Negociação / Proposta e Status
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFields.map((field) => {
                  const currentValue = field.manualMapping || '__auto__'

                  return (
                    <tr key={field.key} className="hover:bg-slate-50/80 transition-colors">
                      {/* Coluna Esquerda: O que o Gerador Espera */}
                      <td className="py-3.5 px-4 align-top space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 text-sm">
                            {field.label}
                          </span>
                          {field.required && (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1 py-0">
                              Obrigatória
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4 px-1.5 py-0 font-mono text-slate-600"
                          >
                            {field.type}
                          </Badge>
                        </div>

                        <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                          <span className="text-slate-400">chave:</span>
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                            {field.key}
                          </span>
                        </div>

                        {field.description && (
                          <p className="text-xs text-slate-500 italic">{field.description}</p>
                        )}
                      </td>

                      {/* Coluna Direita: O que o CRM Envia */}
                      <td className="py-3.5 px-4 align-top space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex-1 max-w-md">
                            <Select
                              value={currentValue}
                              onValueChange={(val) => handleFieldChange(field.key, val)}
                            >
                              <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="Selecione o campo de origem..." />
                              </SelectTrigger>
                              <SelectContent className="max-h-80">
                                <SelectItem value="__auto__" className="text-blue-700 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                                    <span>— automático (sugestão do sistema) —</span>
                                  </div>
                                </SelectItem>

                                {CRM_FIELD_SECTIONS.map((section) => (
                                  <SelectGroup key={section.id}>
                                    <SelectLabel className="text-xs font-bold text-slate-900 bg-slate-100/70 px-2 py-1 my-1 rounded">
                                      {section.label}
                                    </SelectLabel>
                                    {section.fields.map((crmField) => (
                                      <SelectItem
                                        key={crmField.path}
                                        value={crmField.path}
                                        className="text-xs"
                                      >
                                        <div className="flex flex-col">
                                          <span>{crmField.label}</span>
                                          <span className="text-[10px] text-muted-foreground font-mono">
                                            {crmField.path}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="shrink-0">{renderBadge(field.status)}</div>
                        </div>

                        {/* Detalhe de valor resolvido ou sugestão semântica */}
                        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="text-slate-500">
                              {field.manualMapping ? (
                                <span className="text-emerald-700 font-medium">
                                  Override ativo: {field.manualMapping}
                                </span>
                              ) : field.autoSuggestion?.path ? (
                                <span>
                                  Sugestão automática:{' '}
                                  <strong className="text-slate-700">
                                    {field.autoSuggestion.path}
                                  </strong>
                                </span>
                              ) : (
                                <span className="text-rose-600">
                                  Nenhuma correspondência automática encontrada
                                </span>
                              )}
                            </span>

                            {field.effectiveValue !== undefined &&
                              field.effectiveValue !== null && (
                                <span
                                  className="font-mono text-[11px] text-slate-700 truncate max-w-xs"
                                  title={String(field.effectiveValue)}
                                >
                                  Valor atual: <strong>{String(field.effectiveValue)}</strong>
                                </span>
                              )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filteredFields.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-12 text-center text-slate-400">
                      Nenhuma variável dinâmica encontrada com os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
export default TemplateMappingTab
