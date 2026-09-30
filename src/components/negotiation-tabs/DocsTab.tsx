import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  Eye,
  Copy,
  ClipboardList,
  Check,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { ProposalViewer } from '../ProposalViewer'
import { buildDefaultSigners, SignaturePolicy, SignerItem } from '@/lib/signature-utils'
import {
  getSignatureRequestsByNegotiation,
  sendSignatureRequest,
  syncSignatureStatus,
  SignatureRequestRecord,
  getOriginalDocumentUrl,
  getSignedDocumentUrl,
} from '@/services/signatures'

interface DocsTabProps {
  neg: any
  proposals: any[]
}

export function DocsTab({ neg, proposals }: DocsTabProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [signatureRequests, setSignatureRequests] = useState<SignatureRequestRecord[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  // Dados do dono/diretor da empresa para modelos com papel "dono"
  const [companyOwnerName, setCompanyOwnerName] = useState('')
  const [companyOwnerEmail, setCompanyOwnerEmail] = useState('')

  // Seleção de proposta para envio
  const [selectedProposalId, setSelectedProposalId] = useState<string>('')

  // Upload avulso de PDF
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado para visualizador de documento (PDF Original e Assinado)
  const [viewingRequest, setViewingRequest] = useState<SignatureRequestRecord | null>(null)
  const [viewingTab, setViewingTab] = useState<'original' | 'signed'>('original')

  // Estado para visualização/download rápido de PDF gerado a partir de modelo antes do envio
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<{
    blob: Blob
    url: string
    title: string
    filename: string
  } | null>(null)

  // Estado para visualizador de proposta comercial
  const [viewingProposal, setViewingProposal] = useState<any | null>(null)

  // Modelos de Contrato e Procuração
  const [contractTemplates, setContractTemplates] = useState<ContractTemplateRecord[]>([])
  const [selectedContractTemplateId, setSelectedContractTemplateId] = useState<string>('')
  const [poaTemplates, setPoaTemplates] = useState<ContractTemplateRecord[]>([])
  const [selectedPoaTemplateId, setSelectedPoaTemplateId] = useState<string>('')
  const [checklistTemplates, setChecklistTemplates] = useState<ContractTemplateRecord[]>([])
  const [selectedChecklistTemplateId, setSelectedChecklistTemplateId] = useState<string>('')
  const [isPreviewContractModalOpen, setIsPreviewContractModalOpen] = useState(false)
  const [previewTemplateType, setPreviewTemplateType] = useState<
    'contract' | 'power_of_attorney' | 'checklist'
  >('contract')
  const [companyRecord, setCompanyRecord] = useState<any>(null)

  // Modal de envio com ajuste de signatários
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [sendType, setSendType] = useState<
    'proposal' | 'upload' | 'contract' | 'power_of_attorney' | 'checklist'
  >('proposal')
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
      const contracts = await getActiveContractTemplates(neg.company_id, 'contract')
      setContractTemplates(contracts)
      if (contracts.length > 0 && !selectedContractTemplateId) {
        setSelectedContractTemplateId(contracts[0].id)
      }

      const poas = await getActiveContractTemplates(neg.company_id, 'power_of_attorney')
      setPoaTemplates(poas)
      if (poas.length > 0 && !selectedPoaTemplateId) {
        setSelectedPoaTemplateId(poas[0].id)
      }

      const checklists = await getActiveContractTemplates(neg.company_id, 'checklist')
      setChecklistTemplates(checklists)
      if (checklists.length > 0 && !selectedChecklistTemplateId) {
        setSelectedChecklistTemplateId(checklists[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar modelos de documentos:', err)
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

  // Prepara o formulário de envio com os signatários padrão
  const prepareSendModal = (
    type: 'proposal' | 'upload' | 'contract' | 'power_of_attorney' | 'checklist',
  ) => {
    setSendType(type)

    let docName = 'Documento.pdf'
    const leadName = neg.expand?.lead_id?.name || neg.lead_name || 'Cliente'

    if (type === 'proposal') {
      const prop = proposals.find((p) => p.id === selectedProposalId)
      const code = prop?.proposal_code ? `${prop.proposal_code} ` : ''
      docName = prop?.description
        ? `Proposta ${code}- ${prop.description}.pdf`
        : `Proposta ${code}- ${neg.title || 'FV'}.pdf`
    } else if (type === 'contract') {
      const tpl = contractTemplates.find((t) => t.id === selectedContractTemplateId)
      docName = tpl ? `Contrato - ${tpl.name} - ${leadName}.pdf` : `Contrato - ${leadName}.pdf`
    } else if (type === 'power_of_attorney') {
      const tpl = poaTemplates.find((t) => t.id === selectedPoaTemplateId)
      docName = tpl ? `Procuração - ${tpl.name} - ${leadName}.pdf` : `Procuração - ${leadName}.pdf`
    } else if (type === 'checklist') {
      const tpl = checklistTemplates.find((t) => t.id === selectedChecklistTemplateId)
      docName = tpl
        ? `Checklist Técnico - ${tpl.name} - ${leadName}.pdf`
        : `Checklist Técnico - ${leadName}.pdf`
    } else {
      docName = uploadedFile ? uploadedFile.name : 'Documento Avulso.pdf'
    }

    const lead = neg.expand?.lead_id || {}
    const rep = neg.expand?.owner_id || {}

    // Resolução dos signatários padrão a partir do modelo selecionado (fallback: 'client_only')
    let selectedTemplateForPolicy: any = null
    if (type === 'contract') {
      selectedTemplateForPolicy = contractTemplates.find((t) => t.id === selectedContractTemplateId)
    } else if (type === 'power_of_attorney') {
      selectedTemplateForPolicy = poaTemplates.find((t) => t.id === selectedPoaTemplateId)
    } else if (type === 'checklist') {
      selectedTemplateForPolicy = checklistTemplates.find(
        (t) => t.id === selectedChecklistTemplateId,
      )
    }

    const effectivePolicy: SignaturePolicy =
      (selectedTemplateForPolicy?.signature_policy as SignaturePolicy) || 'client_only'

    const defaultSigners = buildDefaultSigners({
      policy: effectivePolicy,
      lead: {
        name: lead.name || neg.lead_name || 'Cliente',
        email: lead.email || '',
        phone: lead.phone || '',
      },
      representative: {
        name: rep.name || user?.name || '',
        email: rep.email || user?.email || '',
        phone: rep.phone || '',
      },
      owner: {
        name: companyOwnerName || '',
        email: companyOwnerEmail || '',
      },
    })

    setActiveSigners(defaultSigners)
    setActiveDocName(docName)
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

  // Gera o Blob de PDF a partir do modelo selecionado e dados da negociação
  const generatePdfForTemplate = (
    type: 'contract' | 'power_of_attorney' | 'checklist',
  ): { blob: Blob; title: string; filename: string } | null => {
    const isPoa = type === 'power_of_attorney'
    const isChecklist = type === 'checklist'
    const tpl = isChecklist
      ? checklistTemplates.find((t) => t.id === selectedChecklistTemplateId)
      : isPoa
        ? poaTemplates.find((t) => t.id === selectedPoaTemplateId)
        : contractTemplates.find((t) => t.id === selectedContractTemplateId)

    if (!tpl) {
      toast({
        variant: 'destructive',
        title: 'Modelo não selecionado',
        description: 'Selecione um modelo de documento antes de gerar o PDF.',
      })
      return null
    }

    const context = buildContractContextFromNegotiation(neg, proposals, companyRecord)
    const resolution = resolveContractPlaceholders(tpl.content, context)
    const leadName = neg.expand?.lead_id?.name || neg.lead_name || 'Cliente'

    const blob = generateContractPDF({
      title: tpl.name,
      content: resolution.resolvedContent,
      companyName: companyRecord?.name || 'Elektra Solar',
      clientName: context.lead?.name || '',
      documentDate: new Date().toLocaleDateString('pt-BR'),
    })

    const prefix = isChecklist ? 'Checklist Tecnico' : isPoa ? 'Procuracao' : 'Contrato'
    const filename = `${prefix} - ${tpl.name} - ${leadName}.pdf`.replace(/[/\\?%*:|"<>]/g, '_')

    return { blob, title: tpl.name, filename }
  }

  // Abre visualização do PDF gerado (modal viewer ou blob URL)
  const handleOpenGeneratedPdfModal = (type: 'contract' | 'power_of_attorney' | 'checklist') => {
    const gen = generatePdfForTemplate(type)
    if (!gen) return
    const url = URL.createObjectURL(gen.blob)
    setGeneratedPdfBlob({ blob: gen.blob, url, title: gen.title, filename: gen.filename })
  }

  // Baixa diretamente o PDF gerado
  const handleDownloadGeneratedPdf = (type: 'contract' | 'power_of_attorney' | 'checklist') => {
    const gen = generatePdfForTemplate(type)
    if (!gen) return
    const url = URL.createObjectURL(gen.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = gen.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast({
      title: 'Download iniciado',
      description: `O arquivo ${gen.filename} foi salvo.`,
    })
  }

  // Abre modal de visualização de solicitação com abas Original / Assinado
  const handleOpenDocumentViewer = (request: SignatureRequestRecord) => {
    setViewingRequest(request)
    // Se estiver assinado e possuir arquivo assinado ou URL, abre direto na aba 'signed', senão 'original'
    if (request.status === 'assinado' && (request.signed_pdf || request.signing_url)) {
      setViewingTab('signed')
    } else {
      setViewingTab('original')
    }
  }

  // Executa o envio para assinatura digital
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
      } else if (
        sendType === 'contract' ||
        sendType === 'power_of_attorney' ||
        sendType === 'checklist'
      ) {
        // Gera o PDF a partir do modelo selecionado (contrato, procuração ou checklist) e dados da negociação
        const isPoa = sendType === 'power_of_attorney'
        const isChecklist = sendType === 'checklist'
        const tpl = isChecklist
          ? checklistTemplates.find((t) => t.id === selectedChecklistTemplateId)
          : isPoa
            ? poaTemplates.find((t) => t.id === selectedPoaTemplateId)
            : contractTemplates.find((t) => t.id === selectedContractTemplateId)

        if (!tpl) {
          throw new Error(
            isChecklist
              ? 'Selecione um modelo de checklist técnico válido.'
              : isPoa
                ? 'Selecione um modelo de procuração válido.'
                : 'Selecione um modelo de contrato válido.',
          )
        }

        const context = buildContractContextFromNegotiation(neg, proposals, companyRecord)
        const resolution = resolveContractPlaceholders(tpl.content, context)

        if (resolution.unresolvedCount > 0) {
          const confirmSendWithUnresolved = confirm(
            `Atenção: este modelo possui ${resolution.unresolvedCount} campo(s) sem preenchimento automático no CRM (${resolution.unresolvedKeys.join(
              ', ',
            )}). Deseja prosseguir com o envio mesmo assim?`,
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
        contract_template_id:
          sendType === 'contract'
            ? selectedContractTemplateId
            : sendType === 'checklist'
              ? selectedChecklistTemplateId
              : sendType === 'power_of_attorney'
                ? selectedPoaTemplateId
                : undefined,
        source: sendType as any,
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
            Envio e controle de assinaturas com validade jurídica via plataforma digital.
          </p>
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
                      {proposals.map((p) => {
                        const codeDisplay =
                          p.proposal_code ||
                          (p.proposal_seq != null
                            ? `#${String(p.proposal_seq).padStart(4, '0')}`
                            : `#${p.id.slice(0, 4)}`)
                        const desc = p.description || 'Sistema Solar FV'
                        const val = (p.total_value || p.price || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-semibold text-primary mr-1.5">{codeDisplay}</span>
                            {desc} — R$ {val}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs"
                    disabled={!selectedProposalId}
                    onClick={() => {
                      const prop = proposals.find((p) => p.id === selectedProposalId)
                      if (!prop) return
                      const link = prop.view_url || prop.snapshot_data?.view_url
                      if (link) {
                        window.open(link, '_blank')
                      } else {
                        setViewingProposal(prop)
                      }
                    }}
                    title="Visualizar a proposta comercial selecionada"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
                    Ver Proposta
                  </Button>
                  <Button
                    className="w-full text-xs"
                    disabled={!selectedProposalId}
                    onClick={() => prepareSendModal('proposal')}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Enviar Proposta
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção 2: Contrato de Prestação */}
        <Card className="flex flex-col justify-between border-primary/30 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-primary font-semibold">
                <FileText className="h-4 w-4 text-primary" />
                2. Contrato de Prestação de Serviços
              </CardTitle>
              <a
                href="/modelos-documentos"
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                Modelos de Documentos <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <CardDescription>
              Gere minutas com preenchimento automático de cliente, usina e valores para assinatura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {contractTemplates.length === 0 ? (
              <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center space-y-2">
                <p>Nenhum modelo de contrato ativo encontrado para esta empresa.</p>
                <a
                  href="/modelos-documentos"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Criar Modelo no Menu Lateral
                </a>
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
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs"
                    disabled={!selectedContractTemplateId}
                    onClick={() => {
                      setPreviewTemplateType('contract')
                      setIsPreviewContractModalOpen(true)
                    }}
                    title="Pré-visualizar minuta e texto em tela"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1 text-blue-600" />
                    Ver Minuta
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-xs"
                    disabled={!selectedContractTemplateId}
                    onClick={() => handleOpenGeneratedPdfModal('contract')}
                    title="Visualizar o PDF diagramado com logotipo e cabeçalho"
                  >
                    <FileText className="h-3.5 w-3.5 mr-1 text-primary" />
                    Ver PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-xs"
                    disabled={!selectedContractTemplateId}
                    onClick={() => handleDownloadGeneratedPdf('contract')}
                    title="Baixar PDF gerado antes de enviar"
                  >
                    <Download className="h-3.5 w-3.5 mr-1 text-slate-700" />
                    Baixar PDF
                  </Button>
                  <Button
                    className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!selectedContractTemplateId}
                    onClick={() => prepareSendModal('contract')}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Enviar
                  </Button>
                </div>{' '}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção 3: Checklist Técnico (ETAPA D) */}
        <Card className="flex flex-col justify-between border-purple-300 bg-purple-50/20 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-purple-900 font-semibold">
                <ClipboardList className="h-4 w-4 text-purple-600" />
                3. Checklist Técnico de Vistoria
              </CardTitle>
              <a
                href="/modelos-documentos"
                className="text-xs text-purple-800 hover:underline flex items-center gap-1 font-medium"
              >
                Modelos de Documentos <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <CardDescription>
              Checklist preenchido automaticamente com dados do cliente, unidade geradora, kit
              consolidado, estrutura e vistoria.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {checklistTemplates.length === 0 ? (
              <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center space-y-2 bg-white/70">
                <p>Nenhum modelo de checklist técnico ativo encontrado.</p>
                <a
                  href="/modelos-documentos"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-800 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Criar Checklist no Menu Lateral
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Modelo de Checklist</Label>
                  <Select
                    value={selectedChecklistTemplateId}
                    onValueChange={setSelectedChecklistTemplateId}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione o modelo de checklist" />
                    </SelectTrigger>
                    <SelectContent>
                      {checklistTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs bg-white"
                    disabled={!selectedChecklistTemplateId}
                    onClick={() => {
                      setPreviewTemplateType('checklist')
                      setIsPreviewContractModalOpen(true)
                    }}
                    title="Pré-visualizar checklist em tela"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1 text-purple-700" />
                    Ver Minuta
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-xs bg-white"
                    disabled={!selectedChecklistTemplateId}
                    onClick={() => handleOpenGeneratedPdfModal('checklist')}
                    title="Visualizar o PDF diagramado com logotipo e cabeçalho"
                  >
                    <ClipboardList className="h-3.5 w-3.5 mr-1 text-purple-700" />
                    Ver PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-xs bg-white"
                    disabled={!selectedChecklistTemplateId}
                    onClick={() => handleDownloadGeneratedPdf('checklist')}
                    title="Baixar PDF do checklist gerado"
                  >
                    <Download className="h-3.5 w-3.5 mr-1 text-purple-700" />
                    Baixar PDF
                  </Button>
                  <Button
                    className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={!selectedChecklistTemplateId}
                    onClick={() => prepareSendModal('checklist')}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Enviar
                  </Button>
                </div>{' '}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção 4: Procuração para Concessionária */}
        <Card className="flex flex-col justify-between border-amber-300 bg-amber-50/20 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2 text-amber-900 font-semibold">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                4. Procuração da Concessionária
              </CardTitle>
              <a
                href="/modelos-documentos"
                className="text-xs text-amber-800 hover:underline flex items-center gap-1 font-medium"
              >
                Modelos de Documentos <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <CardDescription>
              Outorga de poderes para homologação técnica, vistoria e troca de medidor perante a
              distribuidora.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            {poaTemplates.length === 0 ? (
              <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-4 text-center space-y-2 bg-white/70">
                <p>Nenhum modelo de procuração ativo encontrado.</p>
                <a
                  href="/modelos-documentos"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Criar Procuração no Menu Lateral
                </a>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Modelo de Procuração</Label>
                  <Select value={selectedPoaTemplateId} onValueChange={setSelectedPoaTemplateId}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Escolha a procuração" />
                    </SelectTrigger>
                    <SelectContent>
                      {poaTemplates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Button
                    variant="outline"
                    className="w-full text-xs bg-white"
                    disabled={!selectedPoaTemplateId}
                    onClick={() => {
                      setPreviewTemplateType('power_of_attorney')
                      setIsPreviewContractModalOpen(true)
                    }}
                    title="Pré-visualizar procuração em tela"
                  >
                    <Eye className="h-3.5 w-3.5 mr-1 text-amber-700" />
                    Ver Minuta
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-xs bg-white"
                    disabled={!selectedPoaTemplateId}
                    onClick={() => handleOpenGeneratedPdfModal('power_of_attorney')}
                    title="Visualizar o PDF diagramado com logotipo e cabeçalho"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 mr-1 text-amber-700" />
                    Ver PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-xs bg-white"
                    disabled={!selectedPoaTemplateId}
                    onClick={() => handleDownloadGeneratedPdf('power_of_attorney')}
                    title="Baixar PDF da procuração gerada"
                  >
                    <Download className="h-3.5 w-3.5 mr-1 text-amber-700" />
                    Baixar PDF
                  </Button>
                  <Button
                    className="w-full text-xs bg-amber-600 hover:bg-amber-700 text-white"
                    disabled={!selectedPoaTemplateId}
                    onClick={() => prepareSendModal('power_of_attorney')}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Enviar
                  </Button>
                </div>{' '}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Seção 5: Outros documentos */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              5. Outros Documentos (PDF)
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
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  disabled={!uploadedFile}
                  onClick={() => {
                    if (!uploadedFile) return
                    const url = URL.createObjectURL(uploadedFile)
                    window.open(url, '_blank')
                  }}
                  title="Abrir o arquivo PDF em nova aba"
                >
                  <Eye className="h-3.5 w-3.5 mr-1 text-blue-600" />
                  Ver Arquivo
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  disabled={!uploadedFile}
                  onClick={() => {
                    if (!uploadedFile) return
                    const url = URL.createObjectURL(uploadedFile)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = uploadedFile.name
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    setTimeout(() => URL.revokeObjectURL(url), 1000)
                    toast({
                      title: 'Download iniciado',
                      description: `O arquivo ${uploadedFile.name} foi salvo.`,
                    })
                  }}
                  title="Baixar o arquivo PDF selecionado"
                >
                  <Download className="h-3.5 w-3.5 mr-1 text-slate-700" />
                  Baixar PDF
                </Button>
                <Button
                  variant="default"
                  className="w-full text-xs"
                  disabled={!uploadedFile}
                  onClick={() => prepareSendModal('upload')}
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Enviar
                </Button>
              </div>{' '}
            </div>
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
                            : req.source === 'checklist'
                              ? 'Checklist'
                              : req.source === 'power_of_attorney'
                                ? 'Procuração'
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
                      title="Checar status atualizado da assinatura"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 mr-1 ${syncingId === req.id ? 'animate-spin' : ''}`}
                      />
                      Verificar Status
                    </Button>

                    {req.signing_url ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          asChild
                          className="text-xs"
                          title="Abrir página de assinatura"
                        >
                          <a href={req.signing_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Abrir Link
                          </a>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(req.signing_url || '')
                              toast({
                                title: 'Link copiado!',
                                description:
                                  'Link de assinatura copiado para a área de transferência. Pode colar diretamente no WhatsApp do cliente!',
                              })
                            } catch {
                              toast({
                                title: 'Copie o link abaixo:',
                                description: req.signing_url,
                              })
                            }
                          }}
                          title="Copiar link de assinatura para enviar via WhatsApp"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar Link
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs gap-1 text-muted-foreground"
                        onClick={() => handleSyncStatus(req.id)}
                        title="Obter link da assinatura"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Obter Link
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => handleOpenDocumentViewer(req)}
                      title="Visualizar documento original e assinado"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      Ver documento
                    </Button>

                    {req.status === 'assinado' && req.signed_pdf && (
                      <Button variant="default" size="sm" asChild className="text-xs">
                        <a
                          href={pb.files.getURL(req, req.signed_pdf)}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Baixar Assinado
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

      {/* Modal Rápido de Pré-Visualização do Documento Preenchido (Contrato ou Procuração) */}
      <Dialog open={isPreviewContractModalOpen} onOpenChange={setIsPreviewContractModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {(() => {
            const isPoa = previewTemplateType === 'power_of_attorney'
            const isChecklist = previewTemplateType === 'checklist'
            const tpl = isChecklist
              ? checklistTemplates.find((t) => t.id === selectedChecklistTemplateId)
              : isPoa
                ? poaTemplates.find((t) => t.id === selectedPoaTemplateId)
                : contractTemplates.find((t) => t.id === selectedContractTemplateId)

            if (!tpl) return null
            const ctx = buildContractContextFromNegotiation(neg, proposals, companyRecord)
            const res = resolveContractPlaceholders(tpl.content, ctx)

            return (
              <>
                <DialogHeader className="p-4 border-b bg-card shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-base flex items-center gap-2">
                        Pré-visualização:{' '}
                        <span className="font-semibold text-primary">{tpl.name}</span>
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        Campos preenchidos automaticamente com os dados desta negociação.
                      </DialogDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadGeneratedPdf(previewTemplateType)}
                        className="text-xs h-8 gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" /> Baixar PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openContractPrintPreview(res.resolvedContent, tpl.name)}
                        className="text-xs h-8 gap-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Imprimir
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                  <div className="space-y-4 max-w-3xl mx-auto">
                    {res.unresolvedCount > 0 ? (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>
                            Atenção: há <strong>{res.unresolvedCount}</strong> campo(s) sem valor no
                            CRM ({res.unresolvedKeys.join(', ')}).
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                          Todos os campos foram preenchidos automaticamente com os dados da
                          negociação!
                        </span>
                      </div>
                    )}
                    <div className="bg-white p-8 rounded-xl border shadow-sm">
                      <div
                        dangerouslySetInnerHTML={{ __html: res.htmlPreview }}
                        className="prose prose-sm max-w-none font-sans text-slate-800"
                      />
                    </div>
                  </div>
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
                    className={
                      isChecklist
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : isPoa
                          ? 'bg-amber-600 hover:bg-amber-700 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }
                    onClick={() => {
                      setIsPreviewContractModalOpen(false)
                      prepareSendModal(previewTemplateType)
                    }}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" /> Avançar para Envio
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal Visualizador de PDF Gerado a partir de Modelo (Pré-visualização em alta fidelidade) */}
      <Dialog
        open={!!generatedPdfBlob}
        onOpenChange={(open) => {
          if (!open && generatedPdfBlob) {
            URL.revokeObjectURL(generatedPdfBlob.url)
            setGeneratedPdfBlob(null)
          }
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden">
          {generatedPdfBlob && (
            <>
              <DialogHeader className="p-4 border-b bg-card shrink-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <DialogTitle className="text-base font-semibold truncate max-w-md">
                      {generatedPdfBlob.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Documento em formato PDF gerado automaticamente com os dados da negociação.
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5"
                      onClick={() => window.open(generatedPdfBlob.url, '_blank')}
                      title="Abrir PDF em nova aba"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Abrir em Nova Aba
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground"
                      onClick={() => {
                        const a = document.createElement('a')
                        a.href = generatedPdfBlob.url
                        a.download = generatedPdfBlob.filename
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                        toast({
                          title: 'Download iniciado',
                          description: `O arquivo ${generatedPdfBlob.filename} foi salvo.`,
                        })
                      }}
                      title="Baixar arquivo PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Baixar PDF
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="flex-1 bg-slate-900 relative overflow-hidden">
                <iframe
                  src={generatedPdfBlob.url}
                  title={generatedPdfBlob.title}
                  className="w-full h-full border-0 bg-white"
                />
              </div>

              <DialogFooter className="p-3 border-t bg-card shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (generatedPdfBlob) {
                      URL.revokeObjectURL(generatedPdfBlob.url)
                    }
                    setGeneratedPdfBlob(null)
                  }}
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Visualizador de Proposta Comercial (ProposalViewer) */}
      {viewingProposal && (
        <ProposalViewer
          open={!!viewingProposal}
          onOpenChange={(open: boolean) => {
            if (!open) setViewingProposal(null)
          }}
          proposal={viewingProposal}
          negotiation={neg}
        />
      )}

      {/* Modal Visualizador de Documento Completo: Original vs Assinado */}
      <Dialog
        open={!!viewingRequest}
        onOpenChange={(open) => {
          if (!open) {
            setViewingRequest(null)
          }
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] h-[92vh] flex flex-col p-0 overflow-hidden">
          {viewingRequest &&
            (() => {
              const originalUrl = getOriginalDocumentUrl(viewingRequest)
              const signedUrl = getSignedDocumentUrl(viewingRequest)
              const isAssinado =
                viewingRequest.status === 'assinado' || Boolean(viewingRequest.signed_pdf)
              const hasSigned = Boolean(signedUrl)
              const activeUrl = viewingTab === 'signed' ? signedUrl : originalUrl
              const docBaseName = viewingRequest.document_name.replace(/\.pdf$/i, '')
              const currentFileName =
                viewingTab === 'signed'
                  ? `${docBaseName}_assinado.pdf`
                  : `${docBaseName}_original.pdf`

              const handleDownloadCurrent = async () => {
                if (!activeUrl) return
                try {
                  // Tenta baixar via fetch blob para forçar download com nome limpo
                  const res = await fetch(activeUrl)
                  if (res.ok) {
                    const blob = await res.blob()
                    const blobUrl = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = blobUrl
                    a.download = currentFileName
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
                    toast({
                      title: 'Download iniciado',
                      description: `O arquivo ${currentFileName} foi salvo.`,
                    })
                    return
                  }
                } catch {
                  /* intentionally ignored */
                }
                // Fallback para abertura/download direto
                const a = document.createElement('a')
                a.href = activeUrl
                a.download = currentFileName
                a.target = '_blank'
                a.rel = 'noopener noreferrer'
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              }

              return (
                <>
                  <DialogHeader className="p-4 border-b bg-card shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <DialogTitle className="text-base font-semibold truncate max-w-md">
                            {viewingRequest.document_name}
                          </DialogTitle>
                          {getStatusBadge(viewingRequest.status)}
                        </div>
                        <DialogDescription className="text-xs">
                          {viewingRequest.signers && viewingRequest.signers.length > 0 ? (
                            <>Signatários: {viewingRequest.signers.map((s) => s.name).join(', ')}</>
                          ) : (
                            'Visualização do documento em alta fidelidade'
                          )}
                        </DialogDescription>
                      </div>

                      {/* Botões de Ação do Header */}
                      <div className="flex items-center gap-2 shrink-0">
                        {activeUrl && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 gap-1.5"
                              onClick={() => window.open(activeUrl, '_blank')}
                              title="Abrir em nova aba"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Abrir em Nova Aba
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              className="text-xs h-8 gap-1.5 bg-primary text-primary-foreground"
                              onClick={handleDownloadCurrent}
                              title="Baixar a versão atualmente selecionada"
                            >
                              <Download className="h-3.5 w-3.5" />
                              Baixar {viewingTab === 'signed' ? 'Assinado' : 'Original'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Alternância de Abas: Original vs Assinado */}
                    <div className="pt-2">
                      <Tabs
                        value={viewingTab}
                        onValueChange={(v) => setViewingTab(v as 'original' | 'signed')}
                        className="w-full"
                      >
                        <TabsList className="grid w-full max-w-xs grid-cols-2 h-9">
                          <TabsTrigger value="original" className="text-xs gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            Original
                          </TabsTrigger>
                          <TabsTrigger
                            value="signed"
                            disabled={!hasSigned}
                            className="text-xs gap-1.5"
                            title={
                              hasSigned
                                ? 'Visualizar versão assinada com certificado'
                                : isAssinado
                                  ? 'Documento assinado sendo processado'
                                  : 'Disponível após a conclusão das assinaturas'
                            }
                          >
                            <CheckCircle2
                              className={`h-3.5 w-3.5 ${hasSigned ? 'text-emerald-600' : ''}`}
                            />
                            Assinado {hasSigned && '✓'}
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  </DialogHeader>

                  {/* Conteúdo do Visualizador de PDF */}
                  <div className="flex-1 bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
                    {viewingTab === 'original' ? (
                      originalUrl ? (
                        <iframe
                          src={originalUrl}
                          title={`PDF Original - ${viewingRequest.document_name}`}
                          className="w-full h-full border-0 bg-white"
                        />
                      ) : (
                        <div className="p-8 text-center text-slate-300 max-w-md space-y-3">
                          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
                          <h4 className="font-semibold text-white">
                            Arquivo original não armazenado
                          </h4>
                          <p className="text-xs text-slate-400">
                            Este documento foi enviado antes da ativação do armazenamento de cópia
                            original no sistema. Novas solicitações salvam o arquivo
                            automaticamente.
                          </p>
                          {viewingRequest.signing_url && (
                            <Button
                              variant="secondary"
                              size="sm"
                              className="text-xs"
                              onClick={() => window.open(viewingRequest.signing_url, '_blank')}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              Acessar na plataforma de assinatura
                            </Button>
                          )}
                        </div>
                      )
                    ) : hasSigned ? (
                      <iframe
                        src={signedUrl!}
                        title={`PDF Assinado - ${viewingRequest.document_name}`}
                        className="w-full h-full border-0 bg-white"
                      />
                    ) : (
                      <div className="p-8 text-center text-slate-300 max-w-md space-y-3">
                        <Clock className="h-10 w-10 text-amber-400 mx-auto" />
                        <h4 className="font-semibold text-white">Documento ainda não assinado</h4>
                        <p className="text-xs text-slate-400">
                          A versão certificada estará disponível assim que todos os signatários
                          concluírem suas assinaturas.
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleSyncStatus(viewingRequest.id)}
                          disabled={syncingId === viewingRequest.id}
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 mr-1.5 ${
                              syncingId === viewingRequest.id ? 'animate-spin' : ''
                            }`}
                          />
                          Verificar Status Atualizado
                        </Button>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="p-3 border-t bg-card shrink-0 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>
                        Modo: <strong>{viewingTab === 'signed' ? 'Assinado' : 'Original'}</strong>
                      </span>
                      {viewingRequest.signed_at && viewingTab === 'signed' && (
                        <span className="text-emerald-600 font-medium">
                          Concluído em:{' '}
                          {new Date(viewingRequest.signed_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setViewingRequest(null)}>
                      Fechar
                    </Button>
                  </DialogFooter>
                </>
              )
            })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
