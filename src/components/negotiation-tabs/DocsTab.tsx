import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ContractTemplatesManagerModal } from '@/components/ContractTemplatesManagerModal'
import { ContractTemplateRecord, getActiveContractTemplates } from '@/services/contract-templates'
import {
  buildContractContextFromNegotiation,
  resolveContractPlaceholders,
} from '@/lib/contract-resolver'
import { generateContractPDF, pdfBlobToBase64, openContractPrintPreview } from '@/lib/contract-pdf'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText,
  Upload,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Download,
  RefreshCw,
  Users,
  Plus,
  Trash2,
  FileCheck,
  ShieldAlert,
  Settings as SettingsIcon,
  Eye,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import {
  buildDefaultSigners,
  SignaturePolicy,
  SIGNATURE_POLICY_LABELS,
  SignerItem,
} from '@/lib/signature-utils'
import {
  getSignatureRequestsByNegotiation,
  sendSignatureRequest,
  syncSignatureStatus,
  SignatureRequestRecord,
} from '@/services/signatures'

interface DocsTabProps {
  neg: any
  proposals: any[]
}

export function DocsTab({ neg, proposals }: DocsTabProps) {
  const { toast } = useToast()
  const [signatureRequests, setSignatureRequests] = useState<SignatureRequestRecord[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  // Configuração de signatários da empresa
  const [companyPolicy, setCompanyPolicy] = useState<SignaturePolicy>('client_only')
  const [companyOwnerName, setCompanyOwnerName] = useState('')
  const [companyOwnerEmail, setCompanyOwnerEmail] = useState('')
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)

  // Seleção de proposta para envio
  const [selectedProposalId, setSelectedProposalId] = useState<string>('')

  // Upload avulso de PDF
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Etapa B: Modelos de Contrato
  const [contractTemplates, setContractTemplates] = useState<ContractTemplateRecord[]>([])
  const [selectedContractTemplateId, setSelectedContractTemplateId] = useState<string>('')
  const [isTemplatesManagerOpen, setIsTemplatesManagerOpen] = useState(false)
  const [isPreviewContractModalOpen, setIsPreviewContractModalOpen] = useState(false)
  const [companyRecord, setCompanyRecord] = useState<any>(null)

  // Modal de envio com ajuste de signatários
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [sendType, setSendType] = useState<'proposal' | 'upload' | 'contract'>('proposal')
  const [activeDocName, setActiveDocName] = useState('')
  const [activeSigners, setActiveSigners] = useState<SignerItem[]>([])
  const [sendingSignature, setSendingSignature] = useState(false)

  // Carrega dados da empresa e das solicitações de assinatura
  const loadRequests = async () => {
    if (!neg?.id) return
    setLoadingList(true)
    try {
      const list = await getSignatureRequestsByNegotiation(neg.id)
      setSignatureRequests(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingList(false)
    }
  }

  const loadCompanySettings = async () => {
    if (!neg?.company_id) return
    try {
      const comp = await pb.collection('companies').getOne(neg.company_id)
      setCompanyRecord(comp)
      if (comp.signature_policy) {
        setCompanyPolicy(comp.signature_policy as SignaturePolicy)
      }
      if (comp.signature_owner_name) {
        setCompanyOwnerName(comp.signature_owner_name)
      }
      if (comp.signature_owner_email) {
        setCompanyOwnerEmail(comp.signature_owner_email)
      }
    } catch (err) {
      console.error('Erro ao carregar dados da empresa:', err)
    }
  }

  const loadContractTemplates = async () => {
    if (!neg?.company_id) return
    try {
      const tpls = await getActiveContractTemplates(neg.company_id)
      setContractTemplates(tpls)
      if (tpls.length > 0 && !selectedContractTemplateId) {
        setSelectedContractTemplateId(tpls[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar modelos de contrato:', err)
    }
  }

  useEffect(() => {
    loadRequests()
    loadCompanySettings()
    loadContractTemplates()
    if (proposals.length > 0 && !selectedProposalId) {
      setSelectedProposalId(proposals[0].id)
    }
  }, [neg?.id, proposals])

  const handleSaveCompanyConfig = async () => {
    if (!neg?.company_id) return
    setSavingConfig(true)
    try {
      await pb.collection('companies').update(neg.company_id, {
        signature_policy: companyPolicy,
        signature_owner_name: companyOwnerName,
        signature_owner_email: companyOwnerEmail,
      })
      toast({
        title: 'Configurações salvas',
        description: 'Regra de signatários da empresa atualizada com sucesso.',
      })
      setIsConfigDialogOpen(false)
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar a configuração.',
      })
    } finally {
      setSavingConfig(false)
    }
  }

  // Prepara o formulário de envio com os signatários padrão
  const prepareSendModal = (type: 'proposal' | 'upload' | 'contract') => {
    setSendType(type)

    let docName = 'Documento.pdf'
    if (type === 'proposal') {
      const prop = proposals.find((p) => p.id === selectedProposalId)
      docName = prop?.description
        ? `Proposta - ${prop.description}.pdf`
        : `Proposta - ${neg.title || 'FV'}.pdf`
    } else if (type === 'contract') {
      const tpl = contractTemplates.find((t) => t.id === selectedContractTemplateId)
      const leadName = neg.expand?.lead_id?.name || neg.lead_name || 'Cliente'
      docName = tpl ? `Contrato - ${tpl.name} - ${leadName}.pdf` : `Contrato - ${leadName}.pdf`
    } else {
      docName = uploadedFile ? uploadedFile.name : 'Documento Avulso.pdf'
    }
    setActiveDocName(docName)

    // Monta signatários padrão
    const lead = neg.expand?.lead_id || {}
    const owner = neg.expand?.owner_id || {}

    const defaultSigners = buildDefaultSigners({
      policy: companyPolicy,
      lead: {
        name: lead.name || '',
        email: lead.email || '',
        phone: lead.phone || '',
      },
      representative: {
        name: owner.name || '',
        email: owner.email || '',
        phone: owner.phone || '',
      },
      owner: {
        name: companyOwnerName || '',
        email: companyOwnerEmail || '',
      },
    })

    setActiveSigners(defaultSigners)
    setIsSendModalOpen(true)
  }

  const handleAddSigner = () => {
    setActiveSigners([
      ...activeSigners,
      {
        name: '',
        email: '',
        phone: '',
        role: 'other',
      },
    ])
  }

  const handleRemoveSigner = (index: number) => {
    if (activeSigners.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Atenção',
        description: 'É necessário ao menos um signatário para o documento.',
      })
      return
    }
    const updated = activeSigners.filter((_, i) => i !== index)
    setActiveSigners(updated)
  }

  const handleUpdateSigner = (index: number, field: keyof SignerItem, value: string) => {
    const updated = [...activeSigners]
    updated[index] = { ...updated[index], [field]: value }
    setActiveSigners(updated)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast({
        variant: 'destructive',
        title: 'Formato inválido',
        description: 'Apenas arquivos PDF são aceitos para assinatura.',
      })
      return
    }

    if (file.size > 25 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Arquivo muito grande',
        description: 'O PDF não pode ultrapassar 25MB.',
      })
      return
    }

    setUploadedFile(file)
  }

  // Executa o envio para a Assinafy
  const handleConfirmSend = async () => {
    // Valida signatários
    for (let i = 0; i < activeSigners.length; i++) {
      const s = activeSigners[i]
      if (!s.name.trim() || !s.email.trim()) {
        toast({
          variant: 'destructive',
          title: 'Dados incompletos',
          description: `Preencha o nome e o e-mail do signatário #${i + 1}.`,
        })
        return
      }
      if (!s.email.includes('@') || !s.email.includes('.')) {
        toast({
          variant: 'destructive',
          title: 'E-mail inválido',
          description: `O e-mail "${s.email}" parece inválido.`,
        })
        return
      }
    }

    setSendingSignature(true)
    try {
      let pdfBase64: string | undefined = undefined
      let pdfUrl: string | undefined = undefined

      if (sendType === 'upload' && uploadedFile) {
        // Converter arquivo para base64
        const buffer = await uploadedFile.arrayBuffer()
        let binary = ''
        const bytes = new Uint8Array(buffer)
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i])
        }
        pdfBase64 = window.btoa(binary)
      } else if (sendType === 'proposal') {
        const prop = proposals.find((p) => p.id === selectedProposalId)
        if (prop?.view_url) {
          pdfUrl = prop.view_url
        }
      } else if (sendType === 'contract') {
        // Gera o PDF a partir do modelo selecionado e dados da negociação
        const tpl = contractTemplates.find((t) => t.id === selectedContractTemplateId)
        if (!tpl) {
          throw new Error('Selecione um modelo de contrato válido.')
        }

        const context = buildContractContextFromNegotiation(neg, proposals, companyRecord)
        const resolution = resolveContractPlaceholders(tpl.content, context)

        // Se houver placeholders não resolvidos, alertar o usuário mas permitir prosseguir se confirmado
        if (resolution.unresolvedCount > 0) {
          const confirmSendWithUnresolved = confirm(
            `Atenção: este modelo contém ${resolution.unresolvedCount} variável(is) sem correspondência no CRM (${resolution.unresolvedKeys.join(
              ', ',
            )}). Deseja enviar o documento mesmo assim?`,
          )
          if (!confirmSendWithUnresolved) {
            setSendingSignature(false)
            return
          }
        }

        const pdfBlob = generateContractPDF({
          title: tpl.name,
          content: resolution.resolvedContent,
          companyName: companyRecord?.name || 'Elektra Solar',
          clientName: context.lead?.name || '',
          documentDate: new Date().toLocaleDateString('pt-BR'),
        })

        pdfBase64 = await pdfBlobToBase64(pdfBlob)
      }

      await sendSignatureRequest({
        negotiation_id: neg.id,
        proposal_id: sendType === 'proposal' ? selectedProposalId : undefined,
        contract_template_id: sendType === 'contract' ? selectedContractTemplateId : undefined,
        source: sendType,
        document_name: activeDocName,
        signers: activeSigners,
        pdf_base64: pdfBase64,
        pdf_url: pdfUrl,
      })

      toast({
        title: 'Enviado para assinatura!',
        description: 'O documento foi registrado e os convites de assinatura foram disparados.',
      })

      setIsSendModalOpen(false)
      setUploadedFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadRequests()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível enviar',
        description: err.message || 'Ocorreu um erro ao processar o envio.',
      })
    } finally {
      setSendingSignature(false)
    }
  }

  const handleSyncStatus = async (id: string) => {
    setSyncingId(id)
    try {
      await syncSignatureStatus(id)
      await loadRequests()
      toast({ title: 'Status sincronizado' })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na sincronização',
        description: err.message || 'Não foi possível sincronizar o status.',
      })
    } finally {
      setSyncingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assinado':
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white gap-1">
            <CheckCircle2 className="h-3 w-3" /> Assinado
          </Badge>
        )
      case 'recusado':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" /> Recusado
          </Badge>
        )
      case 'cancelado':
        return (
          <Badge variant="secondary" className="gap-1 text-muted-foreground">
            <AlertCircle className="h-3 w-3" /> Cancelado
          </Badge>
        )
      case 'enviado':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300 gap-1 bg-blue-50/50">
            <Clock className="h-3 w-3" /> Enviado
          </Badge>
        )
      case 'aguardando':
      default:
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1 bg-amber-50/50">
            <Clock className="h-3 w-3" /> Aguardando Assinatura
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com configuração de signatários */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Assinatura Digital de Documentos
          </h3>
          <p className="text-sm text-muted-foreground">
            Envio e controle de assinaturas com validade jurídica integrada à Assinafy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsConfigDialogOpen(true)}>
            <SettingsIcon className="h-4 w-4 mr-1.5" />
            Signatários Padrão ({SIGNATURE_POLICY_LABELS[companyPolicy]})
          </Button>
        </div>
      </div>

      {/* Grid de Seções de Documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Seção 1: Proposta */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              1. Proposta Comercial
            </CardTitle>
            <CardDescription>
              Selecione uma proposta FV gerada nesta negociação para enviar à assinatura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {proposals.length === 0 ? (
              <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center">
                Nenhuma proposta gerada nesta negociação ainda. Crie uma proposta na aba "Propostas
                FV".
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Proposta para Assinatura</Label>
                  <Select value={selectedProposalId} onValueChange={setSelectedProposalId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha a proposta" />
                    </SelectTrigger>
                    <SelectContent>
                      {proposals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.description || `Proposta #${p.id.slice(0, 6)}`} — R${' '}
                          {(p.total_value || p.price || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  disabled={!selectedProposalId}
                  onClick={() => prepareSendModal('proposal')}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Proposta para Assinatura
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção 2: Outros documentos */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              2. Outros Documentos (PDF)
            </CardTitle>
            <CardDescription>
              Faça upload de qualquer arquivo em formato PDF da negociação para envio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Selecionar Arquivo PDF</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileChange}
                />
                {uploadedFile && (
                  <p className="text-xs text-muted-foreground">
                    Arquivo selecionado: {uploadedFile.name} (
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                className="w-full border-primary/40 hover:bg-primary/5"
                disabled={!uploadedFile}
                onClick={() => prepareSendModal('upload')}
              >
                <Send className="h-4 w-4 mr-2 text-primary" />
                Enviar PDF para Assinatura
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Seção 3: Contrato de Prestação (ETAPA B ATIVADA) */}
        <Card className="flex flex-col justify-between border-primary/30 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-primary font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                3. Contrato de Prestação de Serviços
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsTemplatesManagerOpen(true)}
                className="text-xs h-7 gap-1 text-primary hover:text-primary hover:bg-primary/10"
              >
                <SettingsIcon className="h-3.5 w-3.5" /> Gerenciar Modelos
              </Button>
            </div>
            <CardDescription>
              Gere minutas com placeholders automáticos {'{cliente_nome}'}, {'{valor_total}'} e
              envie em PDF para a Assinafy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {contractTemplates.length === 0 ? (
              <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center space-y-2">
                <p>Nenhum modelo de contrato ativo encontrado para esta empresa.</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTemplatesManagerOpen(true)}
                  className="text-xs gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Criar Primeiro Modelo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Modelo de Contrato</Label>
                  <Select
                    value={selectedContractTemplateId}
                    onValueChange={setSelectedContractTemplateId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha o modelo de contrato" />
                    </SelectTrigger>
                    <SelectContent>
                      {contractTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs"
                    disabled={!selectedContractTemplateId}
                    onClick={() => setIsPreviewContractModalOpen(true)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                    Pré-visualizar
                  </Button>
                  <Button
                    className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!selectedContractTemplateId}
                    onClick={() => prepareSendModal('contract')}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Enviar Contrato
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção 4: Procuração (Placeholder elegante - Etapa C) */}
        <Card className="opacity-80 border-dashed">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                <ShieldAlert className="h-4 w-4" />
                4. Procuração da Concessionária
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                Em breve (Etapa C)
              </Badge>
            </div>
            <CardDescription>
              Emissão de procurações padronizadas para homologação de acesso junto à concessionária
              de energia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Gere e colha a assinatura do titular na procuração da distribuidora local em um único
              clique com total validade jurídica.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Solicitações de Assinatura */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Solicitações de Assinatura desta Negociação</CardTitle>
            <CardDescription>
              Acompanhe o andamento das assinaturas e baixe os documentos certificados.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadRequests} disabled={loadingList}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loadingList ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {loadingList ? (
            <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
              Carregando solicitações...
            </div>
          ) : signatureRequests.length === 0 ? (
            <div className="text-center py-10 border border-dashed rounded-xl">
              <FileCheck className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                Nenhum documento enviado para assinatura nesta negociação.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Escolha uma proposta acima ou faça o upload de um arquivo PDF para começar.
              </p>
            </div>
          ) : (
            <div className="divide-y border rounded-xl overflow-hidden">
              {signatureRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{req.document_name}</span>
                      {getStatusBadge(req.status)}
                      <Badge variant="outline" className="text-[11px] capitalize">
                        {req.source === 'proposal'
                          ? 'Proposta'
                          : req.source === 'contract'
                            ? 'Contrato'
                            : 'Arquivo'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span>
                        Enviado em:{' '}
                        {req.sent_at
                          ? new Date(req.sent_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Recentemente'}
                      </span>
                      {req.signed_at && (
                        <span className="text-emerald-600 font-medium">
                          Assinado em:{' '}
                          {new Date(req.signed_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      <strong>Signatários:</strong>{' '}
                      {req.signers && Array.isArray(req.signers)
                        ? req.signers.map((s) => `${s.name} (${s.email})`).join(', ')
                        : '—'}
                    </div>
                    {req.error_message && (
                      <p className="text-xs text-red-500 mt-1">{req.error_message}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncStatus(req.id)}
                      disabled={syncingId === req.id}
                      title="Checar status na Assinafy"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 mr-1 ${syncingId === req.id ? 'animate-spin' : ''}`}
                      />
                      Verificar
                    </Button>

                    {req.signing_url && (
                      <Button
                        variant="secondary"
                        size="sm"
                        asChild
                        className="text-xs"
                        title="Abrir página de assinatura"
                      >
                        <a href={req.signing_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Link de Assinatura
                        </a>
                      </Button>
                    )}

                    {req.status === 'assinado' && req.signed_pdf && (
                      <Button variant="default" size="sm" asChild className="text-xs">
                        <a
                          href={pb.files.getURL(req, req.signed_pdf)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Baixar PDF Assinado
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Envio com Ajuste Fino dos Signatários */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Enviar Documento para Assinatura</DialogTitle>
            <DialogDescription>
              Confira os detalhes e os signatários que receberão o convite por e-mail.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nome do Documento</Label>
              <Input
                value={activeDocName}
                onChange={(e) => setActiveDocName(e.target.value)}
                placeholder="Ex: Proposta Comercial.pdf"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Signatários ({activeSigners.length})
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddSigner}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Signatário
                </Button>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {activeSigners.map((s, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-muted/20 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Signatário #{idx + 1}
                        {s.role === 'client' && ' (Cliente)'}
                        {s.role === 'representative' && ' (Representante)'}
                        {s.role === 'owner' && ' (Dono da Empresa)'}
                      </span>
                      {activeSigners.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-500 hover:text-red-700"
                          onClick={() => handleRemoveSigner(idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px]">Nome Completo</Label>
                        <Input
                          value={s.name}
                          onChange={(e) => handleUpdateSigner(idx, 'name', e.target.value)}
                          placeholder="Nome do signatário"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">E-mail</Label>
                        <Input
                          type="email"
                          value={s.email}
                          onChange={(e) => handleUpdateSigner(idx, 'email', e.target.value)}
                          placeholder="email@exemplo.com"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsSendModalOpen(false)}
              disabled={sendingSignature}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirmSend} disabled={sendingSignature}>
              {sendingSignature ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirmar e Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Configuração de Signatários da Empresa */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configuração Global de Signatários</DialogTitle>
            <DialogDescription>
              Defina quem deve assinar os documentos desta empresa por padrão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Quem deve assinar por padrão?</Label>
              <Select
                value={companyPolicy}
                onValueChange={(val) => setCompanyPolicy(val as SignaturePolicy)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client_only">Apenas o Cliente</SelectItem>
                  <SelectItem value="client_rep">Representante + Cliente</SelectItem>
                  <SelectItem value="client_rep_owner">
                    Representante + Cliente + Dono da Empresa
                  </SelectItem>
                  <SelectItem value="client_owner">Cliente + Dono da Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(companyPolicy === 'client_owner' || companyPolicy === 'client_rep_owner') && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Dados do Dono/Diretor da Empresa para assinatura:
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nome do Dono da Empresa</Label>
                  <Input
                    value={companyOwnerName}
                    onChange={(e) => setCompanyOwnerName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo Silveira"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">E-mail do Dono da Empresa</Label>
                  <Input
                    type="email"
                    value={companyOwnerEmail}
                    onChange={(e) => setCompanyOwnerEmail(e.target.value)}
                    placeholder="Ex: diretor@empresa.com.br"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfigDialogOpen(false)}
              disabled={savingConfig}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCompanyConfig} disabled={savingConfig}>
              {savingConfig ? 'Salvando...' : 'Salvar Configuração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Gestão de Modelos de Contrato da Empresa */}
      <ContractTemplatesManagerModal
        isOpen={isTemplatesManagerOpen}
        onClose={() => {
          setIsTemplatesManagerOpen(false)
          loadContractTemplates()
        }}
        companyId={neg?.company_id || ''}
        sampleNegotiation={neg}
        proposals={proposals}
        companyRecord={companyRecord}
        onTemplateSelected={(tpl) => {
          setSelectedContractTemplateId(tpl.id)
        }}
      />

      {/* Modal Rápido de Pré-Visualização do Contrato Preenchido */}
      {selectedContractTemplateId && (
        <Dialog open={isPreviewContractModalOpen} onOpenChange={setIsPreviewContractModalOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-4 border-b bg-card shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base">
                    Pré-visualização do Contrato Preenchido
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Dados mesclados dinamicamente com esta negociação.
                  </DialogDescription>
                </div>
                {(() => {
                  const tpl = contractTemplates.find((t) => t.id === selectedContractTemplateId)
                  if (!tpl) return null
                  const ctx = buildContractContextFromNegotiation(neg, proposals, companyRecord)
                  const res = resolveContractPlaceholders(tpl.content, ctx)
                  return (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openContractPrintPreview(res.resolvedContent, tpl.name)}
                        className="text-xs h-8 gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" /> Versão Imprimível
                      </Button>
                    </div>
                  )
                })()}
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              {(() => {
                const tpl = contractTemplates.find((t) => t.id === selectedContractTemplateId)
                if (!tpl) return null
                const ctx = buildContractContextFromNegotiation(neg, proposals, companyRecord)
                const res = resolveContractPlaceholders(tpl.content, ctx)
                return (
                  <div className="space-y-4 max-w-3xl mx-auto">
                    {res.unresolvedCount > 0 ? (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>
                            Atenção: há <strong>{res.unresolvedCount}</strong> placeholder(s) sem
                            valor no CRM ({res.unresolvedKeys.join(', ')}).
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Todos os placeholders foram preenchidos com sucesso pelo CRM!</span>
                      </div>
                    )}
                    <div className="bg-white p-8 rounded-xl border shadow-sm">
                      <div
                        dangerouslySetInnerHTML={{ __html: res.htmlPreview }}
                        className="prose prose-sm max-w-none font-sans text-slate-800"
                      />
                    </div>
                  </div>
                )
              })()}
            </div>

            <DialogFooter className="p-3 border-t bg-card shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPreviewContractModalOpen(false)}
              >
                Fechar
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setIsPreviewContractModalOpen(false)
                  prepareSendModal('contract')
                }}
              >
                <Send className="h-3.5 w-3.5 mr-1.5" /> Avançar para Envio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
