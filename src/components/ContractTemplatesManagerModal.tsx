import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileText,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Printer,
  ChevronRight,
  BookOpen,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  ContractTemplateRecord,
  getContractTemplates,
  createContractTemplate,
  updateContractTemplate,
  deleteContractTemplate,
} from '@/services/contract-templates'
import {
  resolveContractPlaceholders,
  buildContractContextFromNegotiation,
  extractPlaceholdersFromTemplate,
  ContractContextData,
} from '@/lib/contract-resolver'
import { CRM_FIELD_SECTIONS, CrmFieldDefinition } from '@/lib/dynamic-mapping'
import { openContractPrintPreview } from '@/lib/contract-pdf'

interface ContractTemplatesManagerModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  sampleNegotiation?: any
  proposals?: any[]
  companyRecord?: any
  onTemplateSelected?: (template: ContractTemplateRecord) => void
}

export const ContractTemplatesManagerModal: React.FC<ContractTemplatesManagerModalProps> = ({
  isOpen,
  onClose,
  companyId,
  sampleNegotiation,
  proposals = [],
  companyRecord,
  onTemplateSelected,
}) => {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<ContractTemplateRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplateRecord | null>(null)

  // Modo edição/criação
  const [isEditing, setIsEditing] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [saving, setSaving] = useState(false)

  // Preview dinâmico com negociação real
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all')
  const [tagSearch, setTagSearch] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Contexto derivado da negociação real para visualização
  const dynamicContext: ContractContextData = useMemo(() => {
    return buildContractContextFromNegotiation(sampleNegotiation, proposals, companyRecord)
  }, [sampleNegotiation, proposals, companyRecord])

  const loadTemplates = async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const list = await getContractTemplates(companyId)
      setTemplates(list)
      if (list.length > 0 && !selectedTemplate) {
        setSelectedTemplate(list[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen, companyId])

  const handleStartCreate = () => {
    setSelectedTemplate(null)
    setFormName('')
    setFormDescription('')
    setFormContent(
      `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOVOLTAICOS

**CONTRATADA:** {{empresa_nome}}, CNPJ {{empresa_cnpj}}, telefone {{empresa_telefone}}.
**CONTRATANTE:** {{cliente_nome}}, CPF/CNPJ {{cliente_documento}}, residente em {{cliente_endereco}}, cidade de {{cliente_cidade}}/{{cliente_uf}}.

### 1. OBJETO
Fornecimento e instalação de sistema gerador fotovoltaico com potência de {{potencia_kit}} kWp, com estimativa de geração de {{geracao_estimada}} kWh/mês.

### 2. PREÇO E CONDIÇÕES
O valor total do investimento é de {{valor_total}}, a ser pago via {{forma_pagamento}}.

{{cidade_instalacao}}, {{data_proposta}}.
`,
    )
    setFormActive(true)
    setIsEditing(true)
  }

  const handleStartEdit = (tpl: ContractTemplateRecord) => {
    setSelectedTemplate(tpl)
    setFormName(tpl.name)
    setFormDescription(tpl.description || '')
    setFormContent(tpl.content)
    setFormActive(tpl.active)
    setIsEditing(true)
  }

  const handleSaveTemplate = async () => {
    if (!formName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Nome obrigatório',
        description: 'Dê um nome para identificar este modelo de contrato.',
      })
      return
    }

    if (!formContent.trim()) {
      toast({
        variant: 'destructive',
        title: 'Conteúdo obrigatório',
        description: 'O modelo de contrato precisa conter texto.',
      })
      return
    }

    setSaving(true)
    try {
      if (selectedTemplate) {
        const updated = await updateContractTemplate(selectedTemplate.id, {
          name: formName,
          description: formDescription,
          content: formContent,
          active: formActive,
        })
        toast({ title: 'Modelo atualizado com sucesso!' })
        setSelectedTemplate(updated)
      } else {
        const created = await createContractTemplate({
          company_id: companyId,
          name: formName,
          description: formDescription,
          content: formContent,
          active: formActive,
        })
        toast({ title: 'Modelo criado com sucesso!' })
        setSelectedTemplate(created)
      }
      setIsEditing(false)
      loadTemplates()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar modelo',
        description: err.message || 'Ocorreu um erro ao salvar.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (tpl: ContractTemplateRecord) => {
    if (!confirm(`Deseja realmente excluir o modelo "${tpl.name}"?`)) return
    try {
      await deleteContractTemplate(tpl.id)
      toast({ title: 'Modelo excluído' })
      if (selectedTemplate?.id === tpl.id) {
        setSelectedTemplate(null)
      }
      loadTemplates()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: err.message,
      })
    }
  }

  // Inserir tag de placeholder na posição do cursor no textarea
  const handleInsertTag = (tag: string) => {
    const placeholder = `{{${tag}}}`
    const textarea = textareaRef.current
    if (!textarea) {
      setFormContent((prev) => prev + ' ' + placeholder)
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const current = formContent
    const nextContent = current.substring(0, start) + placeholder + current.substring(end)
    setFormContent(nextContent)

    // Recolocar foco e cursor após a tag inserida
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length)
    }, 50)

    toast({
      title: 'Variável inserida',
      description: `Tag ${placeholder} adicionada ao texto do modelo.`,
      duration: 1500,
    })
  }

  // Filtrar catálogo de tags do CRM
  const filteredCatalogFields = useMemo(() => {
    const list: { tag: string; label: string; section: string }[] = []

    // Mapeamento amigável das tags em português
    const commonTags = [
      // Cliente
      { tag: 'cliente_nome', label: 'Nome do Cliente', section: 'lead' },
      { tag: 'cliente_documento', label: 'CPF / CNPJ do Cliente', section: 'lead' },
      { tag: 'cliente_telefone', label: 'Telefone / WhatsApp', section: 'lead' },
      { tag: 'cliente_email', label: 'E-mail do Cliente', section: 'lead' },
      { tag: 'cliente_endereco', label: 'Endereço Completo', section: 'lead' },
      { tag: 'cliente_cidade', label: 'Cidade do Cliente', section: 'lead' },
      { tag: 'cliente_uf', label: 'Estado (UF)', section: 'lead' },
      { tag: 'cliente_cep', label: 'CEP', section: 'lead' },
      { tag: 'cliente_bairro', label: 'Bairro', section: 'lead' },
      { tag: 'cliente_numero', label: 'Número', section: 'lead' },

      // Empresa
      { tag: 'empresa_nome', label: 'Nome da Sua Empresa', section: 'company' },
      { tag: 'empresa_cnpj', label: 'CNPJ da Empresa', section: 'company' },
      { tag: 'empresa_telefone', label: 'Telefone da Empresa', section: 'company' },
      { tag: 'empresa_email', label: 'E-mail da Empresa', section: 'company' },

      // Negociação
      { tag: 'codigo_proposta', label: 'Número / Código da Proposta', section: 'negotiation' },
      { tag: 'data_proposta', label: 'Data da Proposta', section: 'negotiation' },
      { tag: 'validade_dias', label: 'Validade em Dias', section: 'negotiation' },
      { tag: 'forma_pagamento', label: 'Forma de Pagamento', section: 'negotiation' },
      { tag: 'condicoes_pagamento', label: 'Condições de Pagamento', section: 'negotiation' },
      { tag: 'prazo_instalacao', label: 'Prazo de Execução', section: 'negotiation' },
      { tag: 'consultor_nome', label: 'Nome do Vendedor / Consultor', section: 'negotiation' },
      { tag: 'unidade_consumidora', label: 'Unidade Consumidora (UC)', section: 'negotiation' },

      // Usina / Dimensionamento
      { tag: 'potencia_kit', label: 'Potência do Sistema (kWp)', section: 'sizing' },
      { tag: 'consumo_medio', label: 'Consumo Médio (kWh)', section: 'sizing' },
      { tag: 'geracao_estimada', label: 'Geração Mensal Estimada (kWh)', section: 'sizing' },
      { tag: 'quantidade_modulos', label: 'Qtd. de Módulos (Painéis)', section: 'sizing' },
      { tag: 'concessionaria', label: 'Concessionária de Energia', section: 'sizing' },
      { tag: 'tipo_telhado', label: 'Tipo de Estrutura / Telhado', section: 'sizing' },
      { tag: 'endereco_instalacao', label: 'Endereço da Instalação', section: 'sizing' },
      { tag: 'cidade_instalacao', label: 'Cidade da Usina', section: 'sizing' },
      { tag: 'uf_instalacao', label: 'UF da Usina', section: 'sizing' },

      // Financeiro
      { tag: 'valor_total', label: 'Investimento Total (R$)', section: 'financial' },
      { tag: 'economia_mensal', label: 'Economia Mensal Estimada (R$)', section: 'financial' },
      { tag: 'economia_anual', label: 'Economia Anual (R$)', section: 'financial' },
      { tag: 'economia_25_anos', label: 'Economia em 25 Anos (R$)', section: 'financial' },
      { tag: 'payback_anos', label: 'Payback (Anos)', section: 'financial' },
      { tag: 'tir', label: 'TIR Anual (%)', section: 'financial' },
    ]

    return commonTags.filter((item) => {
      if (selectedCategoryTab !== 'all' && item.section !== selectedCategoryTab) {
        return false
      }
      if (!tagSearch.trim()) return true
      const q = tagSearch.toLowerCase()
      return item.tag.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)
    })
  }, [selectedCategoryTab, tagSearch])

  // Avaliação do texto atual no editor ou visualização
  const previewEvaluation = useMemo(() => {
    const textToEvaluate = isEditing ? formContent : selectedTemplate?.content || ''
    return resolveContractPlaceholders(textToEvaluate, dynamicContext)
  }, [isEditing, formContent, selectedTemplate, dynamicContext])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[88vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-card shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Modelos de Contrato de Prestação de Serviços
              </DialogTitle>
              <DialogDescription className="text-xs">
                Cadastre e edite minutas contratuais personalizadas com placeholders dinâmicos{' '}
                {'{chave}'} preenchidos com os dados da negociação.
              </DialogDescription>
            </div>
            {!isEditing && (
              <Button size="sm" onClick={handleStartCreate} className="gap-1.5 text-xs">
                <Plus className="h-4 w-4" /> Novo Modelo
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden">
          {/* Coluna Esquerda: Lista de Modelos (se não estiver criando/editando do zero em tela cheia) */}
          {!isEditing && (
            <div className="w-72 border-r bg-muted/10 flex flex-col shrink-0">
              <div className="p-3 border-b">
                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                  Modelos da Empresa ({templates.length})
                </span>
              </div>
              <div className="flex-1 overflow-y-auto divide-y">
                {loading ? (
                  <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
                    Carregando modelos...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Nenhum modelo cadastrado. Clique em "Novo Modelo" para criar.
                  </div>
                ) : (
                  templates.map((tpl) => (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl)}
                      className={`p-3 cursor-pointer text-left transition-colors flex items-center justify-between group ${
                        selectedTemplate?.id === tpl.id
                          ? 'bg-primary/10 border-l-4 border-primary font-medium'
                          : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                          {tpl.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {tpl.description || 'Sem descrição'}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge
                            variant={tpl.active ? 'outline' : 'secondary'}
                            className={`text-[9px] px-1 py-0 ${
                              tpl.active
                                ? 'text-emerald-700 bg-emerald-50 border-emerald-300'
                                : 'text-slate-500'
                            }`}
                          >
                            {tpl.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {tpl.placeholders?.length || 0} tags
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Área Principal */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {isEditing ? (
              // FORMULÁRIO DE EDIÇÃO / CRIAÇÃO COM INSERÇÃO DE PLACEHOLDERS
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Editor à esquerda */}
                <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs">Nome do Modelo *</Label>
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Ex: Contrato Padrão Residencial FV"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Switch
                        id="tpl-active"
                        checked={formActive}
                        onCheckedChange={setFormActive}
                      />
                      <Label htmlFor="tpl-active" className="text-xs cursor-pointer">
                        Modelo Ativo para Uso
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Descrição / Finalidade</Label>
                    <Input
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Ex: Utilizado para clientes residenciais até 15 kWp"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="flex-1 flex flex-col space-y-1.5 min-h-[350px]">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs flex items-center gap-1.5 font-semibold">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        Texto do Contrato (Markdown e Placeholders)
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        Use o painel ao lado para inserir variáveis dinâmicas no cursor.
                      </span>
                    </div>
                    <Textarea
                      ref={textareaRef}
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      className="flex-1 font-mono text-xs leading-relaxed resize-none p-3 h-full border-slate-300"
                      placeholder="Digite o texto do contrato aqui..."
                    />
                  </div>
                </div>

                {/* Catálogo de Tags à direita */}
                <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-muted/20 flex flex-col shrink-0 overflow-hidden">
                  <div className="p-3 border-b space-y-2 bg-card">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        Catálogo de Variáveis
                      </span>
                      <span className="text-[10px] text-muted-foreground">Clique para inserir</span>
                    </div>
                    <div className="relative">
                      <Search className="h-3 w-3 absolute left-2 top-2.5 text-muted-foreground" />
                      <Input
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        placeholder="Buscar variável..."
                        className="h-7 text-xs pl-7"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { id: 'all', label: 'Todos' },
                        { id: 'lead', label: 'Cliente' },
                        { id: 'sizing', label: 'Usina' },
                        { id: 'financial', label: 'Financeiro' },
                        { id: 'company', label: 'Empresa' },
                        { id: 'negotiation', label: 'Negócio' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedCategoryTab(tab.id)}
                          className={`text-[10px] px-2 py-0.5 rounded transition-colors ${
                            selectedCategoryTab === tab.id
                              ? 'bg-primary text-primary-foreground font-semibold'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {filteredCatalogFields.length === 0 ? (
                      <p className="text-center text-xs text-muted-foreground py-6">
                        Nenhuma variável encontrada.
                      </p>
                    ) : (
                      filteredCatalogFields.map((item) => (
                        <div
                          key={item.tag}
                          onClick={() => handleInsertTag(item.tag)}
                          className="p-2 rounded border bg-card hover:bg-primary/5 hover:border-primary/40 cursor-pointer transition-all text-left group"
                        >
                          <div className="flex items-center justify-between">
                            <code className="text-[11px] font-bold text-blue-600 group-hover:text-blue-700">
                              {`{{${item.tag}}}`}
                            </code>
                            <Plus className="h-3 w-3 text-muted-foreground group-hover:text-primary shrink-0" />
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {item.label}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : selectedTemplate ? (
              // VISUALIZAÇÃO DO MODELO SELECIONADO COM PRÉVIA PREENCHIDA
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b bg-card flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold flex items-center gap-2">
                      {selectedTemplate.name}
                      <Badge
                        variant={selectedTemplate.active ? 'outline' : 'secondary'}
                        className="text-[10px]"
                      >
                        {selectedTemplate.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedTemplate.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        openContractPrintPreview(
                          previewEvaluation.resolvedContent,
                          selectedTemplate.name,
                        )
                      }
                      className="text-xs h-8 gap-1.5"
                      title="Imprimir ou pré-visualizar em aba dedicada"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-600" /> Imprimir / PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(selectedTemplate)}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(selectedTemplate)}
                      className="text-xs h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Banner de status dos placeholders na negociação atual */}
                <div className="px-4 py-2 bg-muted/40 border-b flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">
                      Preview com Negociação Real:
                    </span>
                    <span className="text-muted-foreground">
                      {sampleNegotiation?.title || 'Negociação atual'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {previewEvaluation.unresolvedCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-800 border-amber-300 gap-1 text-[11px]"
                      >
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        {previewEvaluation.unresolvedCount} tag(s) sem valor
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-800 border-emerald-300 gap-1 text-[11px]"
                      >
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Todas as tags
                        resolvidas
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Conteúdo Renderizado com Destaques */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                  <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl border shadow-sm">
                    <div
                      dangerouslySetInnerHTML={{ __html: previewEvaluation.htmlPreview }}
                      className="prose prose-sm max-w-none font-sans text-slate-800"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-2" />
                <h4 className="text-sm font-semibold">Nenhum modelo selecionado</h4>
                <p className="text-xs max-w-sm mt-1">
                  Selecione um modelo à esquerda para visualizar ou crie um novo para sua empresa.
                </p>
                <Button size="sm" onClick={handleStartCreate} className="mt-4 gap-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Criar Primeiro Modelo
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-3 border-t bg-card shrink-0 flex items-center justify-between sm:justify-between">
          <div>
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-xs"
              >
                Voltar à Lista
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Fechar
            </Button>
            {isEditing ? (
              <Button
                size="sm"
                onClick={handleSaveTemplate}
                disabled={saving}
                className="text-xs bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Salvando...' : 'Salvar Modelo'}
              </Button>
            ) : (
              selectedTemplate &&
              onTemplateSelected && (
                <Button
                  size="sm"
                  onClick={() => {
                    onTemplateSelected(selectedTemplate)
                    onClose()
                  }}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Usar este Modelo na Negociação
                </Button>
              )
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
