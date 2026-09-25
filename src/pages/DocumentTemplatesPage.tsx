import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  ContractTemplateRecord,
  TemplateDocType,
  getContractTemplates,
  createContractTemplate,
  updateContractTemplate,
  deleteContractTemplate,
  extractDocxText,
} from '@/services/contract-templates'
import { CRM_FIELD_SECTIONS, ALL_CRM_FIELDS } from '@/lib/dynamic-mapping'
import { extractPlaceholdersFromTemplate, simpleMarkdownToHtml } from '@/lib/contract-resolver'
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  Eye,
  CheckCircle2,
  Copy,
  UploadCloud,
  FileCode2,
  Search,
  Sparkles,
  ShieldAlert,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function DocumentTemplatesPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  // Verificação rigorosa de papel de administrador da empresa
  // Superadmin Elektra (User_elektra), Dono da conta (User_owner) ou role_company = 'admin'
  const isCompanyAdmin =
    user?.role === 'User_elektra' || user?.role === 'User_owner' || user?.role_company === 'admin'

  const [templates, setTemplates] = useState<ContractTemplateRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<'all' | 'contract' | 'power_of_attorney'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal de edição / criação em tela ampla
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplateRecord | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    description: string
    type: TemplateDocType
    content: string
    active: boolean
  }>({
    name: '',
    description: '',
    type: 'contract',
    content: '',
    active: true,
  })

  // Modal de escolha do modo de criação: manual ou upload de documento
  const [isCreateChoiceOpen, setIsCreateChoiceOpen] = useState(false)

  // Diálogo de confirmação de exclusão
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Extração de docx
  const [extractingDoc, setExtractingDoc] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Busca e filtro no catálogo lateral de campos dinâmicos
  const [fieldSearch, setFieldSearch] = useState('')
  const [activeCatalogTab, setActiveCatalogTab] = useState<string>('all')
  const [editorMode, setEditorMode] = useState<'write' | 'preview'>('write')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const loadData = async () => {
    if (!user?.company_id) return
    setLoading(true)
    try {
      const list = await getContractTemplates(user.company_id)
      setTemplates(list)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar modelos',
        description: 'Não foi possível buscar a lista de modelos de documentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.company_id])

  if (!isCompanyAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-amber-600" />
              <div>
                <CardTitle className="text-amber-900">Acesso Restrito</CardTitle>
                <CardDescription className="text-amber-700">
                  A gestão de modelos de documentos é restrita aos administradores da empresa.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-amber-800">
            Seu usuário possui permissão de operador ou vendedor. Para criar ou editar modelos de
            contratos e procurações, solicite permissão de administrador ao proprietário da conta.
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleStartCreateManual = (type: TemplateDocType = 'contract') => {
    setEditingTemplate(null)
    setFormData({
      name: '',
      description: '',
      type,
      content:
        type === 'power_of_attorney'
          ? `# INSTRUMENTO DE PROCURAÇÃO\n\nOutorgante: {{cliente_nome}}, CPF/CNPJ: {{cliente_documento}}.\nOutorgada: {{empresa_nome}}, CNPJ: {{empresa_cnpj}}.\n\nFinalidade: Homologação na concessionária {{concessionaria}} para usina de {{potencia_kit}} kWp.\n\nLocal e data: {{cidade_instalacao}}, {{data_proposta}}.`
          : `# CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n\nContratante: {{cliente_nome}}, CPF/CNPJ: {{cliente_documento}}.\nContratada: {{empresa_nome}}, CNPJ: {{empresa_cnpj}}.\n\nValor total: {{proposta_valor}}.\n\nData: {{data_proposta}}.`,
      active: true,
    })
    setIsCreateChoiceOpen(false)
    setIsEditorOpen(true)
    setEditorMode('write')
  }

  const handleUploadDocxClick = () => {
    setIsCreateChoiceOpen(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  const handleDocxFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const lower = file.name.toLowerCase()
    if (lower.endsWith('.doc') && !lower.endsWith('.docx')) {
      toast({
        title: 'Formato legado não suportado (.doc)',
        description:
          'Por favor, converta para .docx no Word ou Google Docs antes de enviar, ou copie e cole o texto no editor.',
        variant: 'destructive',
      })
      return
    }

    if (!lower.endsWith('.docx')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione um arquivo de documento Word (.docx).',
        variant: 'destructive',
      })
      return
    }

    setExtractingDoc(true)
    try {
      toast({
        title: 'Lendo documento...',
        description: 'Extraindo o texto do arquivo Word para o editor.',
      })
      const result = await extractDocxText(file)
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')

      setEditingTemplate(null)
      setFormData({
        name: baseName || 'Novo Modelo de Documento',
        description: `Importado a partir do arquivo ${file.name}`,
        type: 'contract',
        content: result.markdown || '',
        active: true,
      })
      setIsEditorOpen(true)
      setEditorMode('write')
      toast({
        title: 'Texto extraído com sucesso!',
        description: 'Agora clique nos campos à direita para inseri-los no seu texto onde desejar.',
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao processar arquivo',
        description: err.message || 'Não foi possível extrair o texto do documento.',
        variant: 'destructive',
      })
    } finally {
      setExtractingDoc(false)
    }
  }

  const handleEdit = (tmpl: ContractTemplateRecord) => {
    setEditingTemplate(tmpl)
    setFormData({
      name: tmpl.name,
      description: tmpl.description || '',
      type: tmpl.type || 'contract',
      content: tmpl.content,
      active: tmpl.active,
    })
    setIsEditorOpen(true)
    setEditorMode('write')
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do modelo.',
        variant: 'destructive',
      })
      return
    }
    if (!formData.content.trim()) {
      toast({
        title: 'Conteúdo obrigatório',
        description: 'O texto do modelo não pode estar vazio.',
        variant: 'destructive',
      })
      return
    }
    if (!user?.company_id) return

    setSaving(true)
    try {
      if (editingTemplate) {
        await updateContractTemplate(editingTemplate.id, {
          name: formData.name,
          description: formData.description,
          type: formData.type,
          content: formData.content,
          active: formData.active,
        })
        toast({ title: 'Modelo atualizado com sucesso!' })
      } else {
        await createContractTemplate({
          company_id: user.company_id,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          content: formData.content,
          active: formData.active,
        })
        toast({ title: 'Modelo criado com sucesso!' })
      }
      setIsEditorOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar modelo',
        description: err.message || 'Verifique se possui permissão de administrador.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    try {
      await deleteContractTemplate(deleteConfirmId)
      toast({ title: 'Modelo removido com sucesso.' })
      setDeleteConfirmId(null)
      loadData()
    } catch (err) {
      console.error(err)
      toast({ title: 'Erro ao excluir modelo', variant: 'destructive' })
    }
  }

  const insertFieldIntoEditor = (token: string) => {
    const placeholder = `{{${token}}}`
    const textarea = textareaRef.current
    if (!textarea) {
      setFormData((prev) => ({ ...prev, content: prev.content + ` ${placeholder} ` }))
      return
    }

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const before = text.substring(0, start)
    const after = text.substring(end)
    const newText = before + placeholder + after

    setFormData((prev) => ({ ...prev, content: newText }))

    setTimeout(() => {
      textarea.focus()
      const newCursor = start + placeholder.length
      textarea.setSelectionRange(newCursor, newCursor)
    }, 50)

    toast({
      title: 'Campo inserido!',
      description: `Campo ${placeholder} adicionado na posição do cursor.`,
    })
  }

  // Filtragem dos modelos na lista
  const filteredTemplates = templates.filter((t) => {
    const matchesType =
      filterType === 'all'
        ? true
        : filterType === 'power_of_attorney'
          ? t.type === 'power_of_attorney'
          : t.type === 'contract' || !t.type

    const matchesSearch =
      !searchQuery.trim() ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())

    return matchesType && matchesSearch
  })

  // Campos dinâmicos filtrados para o catálogo lateral do editor
  const filteredFields = ALL_CRM_FIELDS.filter((f) => {
    const matchesSearch =
      !fieldSearch.trim() ||
      f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
      f.key.toLowerCase().includes(fieldSearch.toLowerCase()) ||
      f.aliases.some((a) => a.toLowerCase().includes(fieldSearch.toLowerCase()))

    const matchesSection = activeCatalogTab === 'all' || f.section === activeCatalogTab
    return matchesSearch && matchesSection
  })

  const detectedPlaceholders = extractPlaceholdersFromTemplate(formData.content)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Input oculto para carregar arquivo .docx */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDocxFileSelected}
        accept=".docx,.doc"
        className="hidden"
      />

      {/* Cabeçalho da página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary" />
            Modelos de Documentos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie os contratos de prestação de serviços e procurações homologatórias da sua
            empresa. Os campos são preenchidos automaticamente com os dados da negociação.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateChoiceOpen(true)}
            className="gap-2 shadow-sm"
            disabled={extractingDoc}
          >
            <Plus className="w-4 h-4" />
            {extractingDoc ? 'Processando Documento...' : 'Novo Modelo'}
          </Button>
        </div>
      </div>

      {/* Barra de Filtro e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border shadow-sm">
        <Tabs
          value={filterType}
          onValueChange={(v) => setFilterType(v as any)}
          className="w-full sm:w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">Todos ({templates.length})</TabsTrigger>
            <TabsTrigger value="contract">
              Contratos ({templates.filter((t) => t.type === 'contract' || !t.type).length})
            </TabsTrigger>
            <TabsTrigger value="power_of_attorney">
              Procurações ({templates.filter((t) => t.type === 'power_of_attorney').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar modelo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Grid de Modelos */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Carregando modelos de documentos...</div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="border-dashed border-2 p-12 text-center">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="p-3 bg-slate-100 rounded-full text-slate-500">
              <FileCode2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Nenhum modelo encontrado</h3>
            <p className="text-sm text-slate-500 max-w-md">
              Você pode escrever um novo modelo direto na plataforma ou importar um arquivo Word
              (.docx) para carregar o texto.
            </p>
            <Button onClick={() => setIsCreateChoiceOpen(true)} className="gap-2 mt-2">
              <Plus className="w-4 h-4" />
              Criar Primeiro Modelo
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const isPoa = template.type === 'power_of_attorney'
            const fieldCount =
              template.placeholders?.length ||
              extractPlaceholdersFromTemplate(template.content).length
            return (
              <Card
                key={template.id}
                className="hover:shadow-md transition-shadow border-slate-200 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge
                      variant={isPoa ? 'secondary' : 'default'}
                      className={
                        isPoa
                          ? 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                          : 'bg-blue-600 text-white'
                      }
                    >
                      {isPoa ? 'Procuração' : 'Contrato'}
                    </Badge>
                    <Badge
                      variant={template.active ? 'outline' : 'secondary'}
                      className={
                        template.active ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : ''
                      }
                    >
                      {template.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-semibold mt-2 line-clamp-1">
                    {template.name}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-2 min-h-[32px]">
                    {template.description || 'Sem descrição cadastrada.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="text-xs text-slate-500 flex items-center justify-between border-t pt-2">
                    <span>Campos automáticos:</span>
                    <span className="font-semibold text-slate-700">{fieldCount} campos</span>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 h-8 text-xs"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Editar Modelo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteConfirmId(template.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL 1: Escolha do modo de criação (Manual ou DOCX) */}
      <Dialog open={isCreateChoiceOpen} onOpenChange={setIsCreateChoiceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Modelo de Documento</DialogTitle>
            <DialogDescription>
              Escolha como deseja iniciar a elaboração do seu modelo:
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-4">
            <button
              onClick={() => handleStartCreateManual('contract')}
              className="flex items-start gap-4 p-4 rounded-lg border-2 border-slate-200 hover:border-primary hover:bg-primary/5 transition-all text-left group"
            >
              <div className="p-2.5 rounded-md bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileCode2 className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900 group-hover:text-primary">
                  Escrever Contrato do Zero
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Use o editor visual com catálogo lateral de campos automáticos clicáveis.
                </p>
              </div>
            </button>

            <button
              onClick={() => handleStartCreateManual('power_of_attorney')}
              className="flex items-start gap-4 p-4 rounded-lg border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 transition-all text-left group"
            >
              <div className="p-2.5 rounded-md bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900 group-hover:text-amber-800">
                  Escrever Procuração do Zero
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Modelo para homologação junto à concessionária de energia.
                </p>
              </div>
            </button>

            <button
              onClick={handleUploadDocxClick}
              className="flex items-start gap-4 p-4 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all text-left group"
            >
              <div className="p-2.5 rounded-md bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-slate-900 group-hover:text-emerald-800">
                  Importar Arquivo Word (.docx)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Extrai o texto original do seu arquivo para o editor, permitindo inserir os campos
                  automáticos com um clique.
                </p>
              </div>
            </button>
          </div>

          <div className="bg-slate-50 border rounded p-2.5 text-xs text-slate-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Lembrete de Assinatura:</strong> Os documentos enviados para assinatura
              digital serão sempre gerados em formato PDF padrão oficial.
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Editor AMPLO (Widescreen 95vw / h-[90vh]) — Soluciona o feedback de tela espremida */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] h-[92vh] max-h-[92vh] p-0 flex flex-col gap-0 overflow-hidden">
          {/* Topbar do Editor */}
          <div className="px-6 py-3 border-b flex items-center justify-between bg-slate-50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-slate-900">
                  {editingTemplate
                    ? `Editar Modelo: ${formData.name || 'Sem nome'}`
                    : 'Novo Modelo de Documento'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Layout ampliado para edição de contratos e procurações completas.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center border rounded-md p-1 bg-white">
                <Button
                  size="sm"
                  variant={editorMode === 'write' ? 'secondary' : 'ghost'}
                  onClick={() => setEditorMode('write')}
                  className="h-7 text-xs px-3"
                >
                  Editor de Texto
                </Button>
                <Button
                  size="sm"
                  variant={editorMode === 'preview' ? 'secondary' : 'ghost'}
                  onClick={() => setEditorMode('preview')}
                  className="h-7 text-xs px-3"
                >
                  <Eye className="w-3.5 h-3.5 mr-1" />
                  Pré-visualização
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditorOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? 'Salvando...' : 'Salvar Modelo'}
              </Button>
            </div>
          </div>

          {/* Dados Gerais do Modelo */}
          <div className="px-6 py-3 border-b bg-white grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0 text-sm">
            <div className="md:col-span-2">
              <Label className="text-xs text-slate-600">Nome do Modelo *</Label>
              <Input
                placeholder="Ex: Contrato de Instalação Fotovoltaica Residencial"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="h-8 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">Tipo de Documento</Label>
              <Select
                value={formData.type}
                onValueChange={(v: TemplateDocType) =>
                  setFormData((prev) => ({ ...prev, type: v }))
                }
              >
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contract">Contrato de Prestação de Serviços</SelectItem>
                  <SelectItem value="power_of_attorney">Procuração para Concessionária</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-600">Status</Label>
              <Select
                value={formData.active ? 'active' : 'inactive'}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, active: v === 'active' }))}
              >
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo (visível nas negociações)</SelectItem>
                  <SelectItem value="inactive">Inativo (oculto)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Área Principal: 2 Colunas (Editor Amplo à esquerda + Catálogo de Campos à direita) */}
          <div className="flex-1 flex overflow-hidden">
            {/* Coluna Esquerda: Editor de Texto ou Preview */}
            <div className="flex-1 flex flex-col p-4 bg-slate-100 overflow-hidden">
              {editorMode === 'write' ? (
                <div className="flex-1 flex flex-col bg-white rounded-lg border shadow-sm p-4 overflow-hidden">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b text-xs text-slate-500">
                    <span>
                      Escreva o texto do seu modelo. Onde desejar que um dado da negociação entre
                      automaticamente, clique no campo correspondente na coluna da direita.
                    </span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {detectedPlaceholders.length} campos detectados
                    </span>
                  </div>
                  <Textarea
                    ref={textareaRef}
                    value={formData.content}
                    onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                    placeholder="Cole ou escreva o texto do contrato aqui..."
                    className="flex-1 w-full resize-none font-mono text-xs leading-relaxed border-0 focus-visible:ring-0 p-2 overflow-y-auto"
                  />
                </div>
              ) : (
                <div className="flex-1 bg-white rounded-lg border shadow-sm p-8 overflow-y-auto max-w-4xl mx-auto w-full">
                  <div className="mb-4 pb-3 border-b">
                    <h2 className="text-xl font-bold text-slate-800">
                      {formData.name || 'Sem título'}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pré-visualização do modelo (os campos entre chaves duplas serão substituídos
                      na negociação).
                    </p>
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-slate-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(formData.content) }}
                  />
                </div>
              )}
            </div>

            {/* Coluna Direita: Catálogo Lateral de Campos Clicáveis */}
            <div className="w-80 md:w-96 border-l bg-white flex flex-col overflow-hidden shrink-0">
              <div className="p-3 border-b bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Inserir Campo Automático
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    Clique para inserir
                  </Badge>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Filtrar campos (ex: cliente, valor, cpf)..."
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    className="h-7 text-xs pl-8"
                  />
                </div>
              </div>

              {/* Categorias */}
              <div className="px-2 py-1.5 border-b bg-slate-50/50 flex flex-wrap gap-1 text-[11px]">
                <button
                  onClick={() => setActiveCatalogTab('all')}
                  className={`px-2 py-0.5 rounded ${
                    activeCatalogTab === 'all'
                      ? 'bg-primary text-white font-medium'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({ALL_CRM_FIELDS.length})
                </button>
                {CRM_FIELD_SECTIONS.map((sec) => (
                  <button
                    key={sec.id}
                    onClick={() => setActiveCatalogTab(sec.id)}
                    className={`px-2 py-0.5 rounded ${
                      activeCatalogTab === sec.id
                        ? 'bg-primary text-white font-medium'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sec.label}
                  </button>
                ))}
              </div>

              {/* Lista dos Campos */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {filteredFields.map((field) => (
                  <button
                    key={field.key}
                    onClick={() => insertFieldIntoEditor(field.key)}
                    className="w-full text-left p-2 rounded border border-slate-100 hover:border-primary/40 hover:bg-primary/5 transition-colors group flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 group-hover:text-primary truncate">
                        {field.label}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {`{{${field.key}}}`}
                      </div>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary shrink-0 mt-0.5" />
                  </button>
                ))}
              </div>

              {/* Dica no rodapé */}
              <div className="p-2.5 border-t bg-slate-50 text-[11px] text-slate-500">
                Os dados marcados com <code>{'{{nome_do_campo}}'}</code> são substituídos
                automaticamente na geração do documento para cada cliente.
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação de exclusão */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Modelo de Documento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá o modelo permanentemente. Documentos e solicitações já geradas
              anteriormente continuarão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
