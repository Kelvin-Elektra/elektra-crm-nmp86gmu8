import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getNegotiation, getProposalsByNeg } from '@/services/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  User,
  Calculator,
  FileText,
  ShoppingCart,
  Folder,
  FileArchive,
  ArrowRightLeft,
  ShieldCheck,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MarkNegotiationLostDialog } from '@/components/MarkNegotiationLostDialog'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { ClientDetailsTab } from '@/components/negotiation-tabs/ClientDetailsTab'
import { SizingTab } from '@/components/negotiation-tabs/SizingTab'
import { BudgetsTab } from '@/components/negotiation-tabs/BudgetsTab'
import { FilesTab } from '@/components/negotiation-tabs/FilesTab'
import { ProposalsTab } from '@/components/negotiation-tabs/ProposalsTab'
import { DocsTab } from '@/components/negotiation-tabs/DocsTab'
import { ProjectValidatorTab } from '@/components/negotiation-tabs/ProjectValidatorTab'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Info } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { WhatsAppContactButton } from '@/components/WhatsAppContactButton'

export default function NegotiationDetail() {
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [neg, setNeg] = useState<any>(null)
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [pipelineStages, setPipelineStages] = useState<any[]>([])
  const [validatorModules, setValidatorModules] = useState<any[]>([])
  const [validatorInverters, setValidatorInverters] = useState<any[]>([])
  const [validatorUtilities, setValidatorUtilities] = useState<any[]>([])
  const [pendingLossMove, setPendingLossMove] = useState<{
    stageId: string
    title?: string
  } | null>(null)

  const loadData = async () => {
    if (!id) return
    try {
      const data = await getNegotiation(id)
      setNeg(data)
      const props = await getProposalsByNeg(id)
      props.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime())
      setProposals(props)
      const stgs = await pb.collection('pipeline_stages').getFullList()
      setPipelineStages(stgs)

      // Carregar módulos, inversores e concessionárias para o validador
      if (data?.company_id) {
        pb.collection('pv_modules')
          .getFullList({ filter: `company_id = '${data.company_id}'` })
          .then(setValidatorModules)
          .catch(() => {})
        pb.collection('pv_inverters')
          .getFullList({ filter: `company_id = '${data.company_id}'` })
          .then(setValidatorInverters)
          .catch(() => {})
        pb.collection('pv_utilities')
          .getFullList({ filter: `company_id = '${data.company_id}'` })
          .then(setValidatorUtilities)
          .catch(() => {})
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [id])
  useRealtime('negotiations', (e) => {
    if (e.record.id === id) loadData()
  })
  useRealtime('proposals', loadData)
  useRealtime('leads', loadData)

  const isAdmin = user?.role === 'admin_company' || user?.role === 'admin_elektra'

  useEffect(() => {
    if (neg && isAdmin) {
      pb.collection('users')
        .getFullList({ filter: `company_id = '${neg.company_id}'` })
        .then(setUsers)
        .catch(console.error)
    }
  }, [neg?.company_id, isAdmin])

  const isLossStageCheck = (stageId: string, stageName?: string) => {
    const stg = pipelineStages.find((s) => s.id === stageId)
    if (stg?.is_loss_stage) return true
    const name = (stageName || stg?.name || '').toLowerCase()
    return name.includes('perd') || name.includes('cancelad') || name.includes('desist')
  }

  const handleStageChange = async (targetStageId: string) => {
    if (!neg || neg.stage === targetStageId) return

    const targetStage = pipelineStages.find((s) => s.id === targetStageId)
    if (isLossStageCheck(targetStageId, targetStage?.name)) {
      setPendingLossMove({
        stageId: targetStageId,
        title: neg.title,
      })
      return
    }

    try {
      const now = new Date().toISOString()
      await pb.collection('negotiations').update(neg.id, {
        stage: targetStageId,
        stage_changed_at: now,
        lost_at: null,
        loss_reason: null,
        loss_notes: null,
      })
      toast({
        title: 'Estágio atualizado',
        description: `Negociação movida para "${targetStage?.name || 'novo estágio'}".`,
      })
      loadData()
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e.message || 'Não foi possível alterar o estágio.',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmLoss = async (reason: string, notes: string) => {
    if (!pendingLossMove || !neg) return
    const { stageId } = pendingLossMove
    const now = new Date().toISOString()

    try {
      await pb.collection('negotiations').update(neg.id, {
        stage: stageId,
        stage_changed_at: now,
        lost_at: now,
        loss_reason: reason,
        loss_notes: notes,
      })
      toast({
        title: 'Negociação marcada como perdida',
        description: 'Motivo de perda registrado com sucesso.',
      })
      setPendingLossMove(null)
      loadData()
    } catch (e: any) {
      toast({
        title: 'Erro ao registrar perda',
        description: e.message || 'Falha ao mover para estágio de perda.',
        variant: 'destructive',
      })
    }
  }

  const handleOwnerChange = async (newOwnerId: string) => {
    try {
      await pb.collection('negotiations').update(neg.id, { owner_id: newOwnerId })
      loadData()
      toast({ title: 'Sucesso', description: 'Responsável atualizado.' })
    } catch (e) {
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o responsável.',
        variant: 'destructive',
      })
    }
  }

  if (loading)
    return <div className="p-8 flex justify-center animate-pulse">Carregando negociação...</div>
  if (!neg) return <div className="p-8 text-center text-destructive">Negociação não encontrada</div>

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto animate-fade-in pb-12 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/negociacoes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{neg.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                variant="outline"
                className="font-mono text-xs text-muted-foreground border-border/50 bg-background"
              >
                ID: {neg.id}
              </Badge>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary">
                  {pipelineStages.find((s) => s.id === neg.stage)?.name ||
                    (neg.stage === 'Venda Fechada' ? 'Venda Fechada' : neg.stage)}
                </Badge>
                {pipelineStages.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted gap-1"
                        title="Mover negociação para outro estágio"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        <span className="text-[11px] font-normal">Mover</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider py-1">
                        Mover para estágio
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {pipelineStages
                        .filter((s) => s.id !== neg.stage)
                        .map((s) => (
                          <DropdownMenuItem
                            key={s.id}
                            onClick={() => handleStageChange(s.id)}
                            className="text-xs cursor-pointer flex items-center justify-between"
                          >
                            <span>{s.name}</span>
                            {isLossStageCheck(s.id, s.name) && (
                              <span className="text-[10px] text-rose-500 font-medium">Perda</span>
                            )}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <span className="text-sm text-muted-foreground flex items-center ml-2">
                <User className="h-3 w-3 mr-1" />
                Responsável:{' '}
                {isAdmin ? (
                  <Select value={neg.owner_id || ''} onValueChange={handleOwnerChange}>
                    <SelectTrigger className="h-6 w-auto text-xs ml-1 border-none bg-transparent hover:bg-muted focus:ring-0 px-1 py-0 shadow-none font-semibold">
                      <SelectValue placeholder="Não atribuído" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <strong className="ml-1">{neg.expand?.owner_id?.name || 'Não atribuído'}</strong>
                )}
              </span>
            </div>
          </div>
        </div>
        {neg.expand?.lead_id?.phone && (
          <div className="flex items-center gap-2">
            <WhatsAppContactButton
              phone={neg.expand.lead_id.phone}
              clientName={neg.expand.lead_id.name}
              variant="outline"
              size="default"
              showLabel={true}
              className="bg-background shadow-xs font-medium"
            />
          </div>
        )}
      </div>

      <Tabs defaultValue="detalhes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto gap-2 p-1 bg-muted/50 rounded-xl overflow-x-auto">
          <TabsTrigger value="detalhes" className="py-2.5 rounded-lg data-[state=active]:shadow-sm">
            <User className="mr-2 h-4 w-4 hidden md:block" /> Cliente
          </TabsTrigger>
          <TabsTrigger
            value="dimensionamento"
            className="py-2.5 rounded-lg data-[state=active]:shadow-sm"
          >
            <Calculator className="mr-2 h-4 w-4 hidden md:block" /> Dimensionamento
          </TabsTrigger>
          <TabsTrigger
            value="validacao"
            className="py-2.5 rounded-lg data-[state=active]:shadow-sm"
          >
            <ShieldCheck className="mr-2 h-4 w-4 hidden md:block text-primary" /> Validação
          </TabsTrigger>
          <TabsTrigger
            value="propostas"
            className="py-2.5 rounded-lg data-[state=active]:shadow-sm"
          >
            <FileText className="mr-2 h-4 w-4 hidden md:block" /> Propostas FV
          </TabsTrigger>
          <TabsTrigger
            value="orcamentos"
            className="py-2.5 rounded-lg data-[state=active]:shadow-sm"
          >
            <ShoppingCart className="mr-2 h-4 w-4 hidden md:block" /> Orçamentos
          </TabsTrigger>
          <TabsTrigger
            value="documentos"
            className="py-2.5 rounded-lg data-[state=active]:shadow-sm"
          >
            <Folder className="mr-2 h-4 w-4 hidden md:block" /> Docs
          </TabsTrigger>
          <TabsTrigger value="arquivos" className="py-2.5 rounded-lg data-[state=active]:shadow-sm">
            <FileArchive className="mr-2 h-4 w-4 hidden md:block" /> Arquivos
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="detalhes" className="mt-0">
            <ClientDetailsTab neg={neg} />
          </TabsContent>
          <TabsContent value="dimensionamento" className="mt-0">
            <SizingTab neg={neg} reload={loadData} />
          </TabsContent>
          <TabsContent value="validacao" className="mt-0">
            <ProjectValidatorTab
              negotiation={neg}
              modules={validatorModules}
              inverters={validatorInverters}
              utilities={validatorUtilities}
            />
          </TabsContent>
          <TabsContent value="propostas" className="mt-0">
            <ProposalsTab proposals={proposals} neg={neg} reload={loadData} />
          </TabsContent>
          <TabsContent value="orcamentos" className="mt-0 flex flex-col gap-6">
            <BudgetsTab neg={neg} />
          </TabsContent>
          <TabsContent value="documentos" className="mt-0">
            <DocsTab neg={neg} proposals={proposals} />
          </TabsContent>
          <TabsContent value="arquivos" className="mt-0">
            <FilesTab neg={neg} reload={loadData} />
          </TabsContent>
        </div>
      </Tabs>
      {/* Diálogo obrigatório de motivo de perda ao mover para estágio de perda */}
      <MarkNegotiationLostDialog
        open={Boolean(pendingLossMove)}
        onOpenChange={(op) => !op && setPendingLossMove(null)}
        negotiationTitle={pendingLossMove?.title}
        onConfirm={handleConfirmLoss}
      />
    </div>
  )
}
