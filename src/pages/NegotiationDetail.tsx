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
} from 'lucide-react'
import { useRealtime } from '@/hooks/use-realtime'
import { ClientDetailsTab } from '@/components/negotiation-tabs/ClientDetailsTab'
import { SizingTab } from '@/components/negotiation-tabs/SizingTab'
import { BudgetsTab } from '@/components/negotiation-tabs/BudgetsTab'
import { FilesTab } from '@/components/negotiation-tabs/FilesTab'
import { ProposalsTab } from '@/components/negotiation-tabs/ProposalsTab'

export default function NegotiationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [neg, setNeg] = useState<any>(null)
  const [proposals, setProposals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!id) return
    try {
      const data = await getNegotiation(id)
      setNeg(data)
      const props = await getProposalsByNeg(id)
      setProposals(props)
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
              <Badge variant="secondary">{neg.stage}</Badge>
              <span className="text-sm text-muted-foreground flex items-center">
                <User className="h-3 w-3 mr-1" />
                Responsável:{' '}
                <strong className="ml-1">{neg.expand?.owner_id?.name || 'Não atribuído'}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="detalhes" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto gap-2 p-1 bg-muted/50 rounded-xl overflow-x-auto">
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
          <TabsContent value="propostas" className="mt-0">
            <ProposalsTab proposals={proposals} />
          </TabsContent>
          <TabsContent value="orcamentos" className="mt-0">
            <BudgetsTab neg={neg} />
          </TabsContent>
          <TabsContent value="documentos" className="mt-0">
            <div className="text-center p-12 border rounded-xl bg-muted/10 border-dashed">
              <Folder className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Contratos e Documentos Oficiais</h3>
              <p className="text-muted-foreground text-sm max-w-md mx-auto mt-2">
                Em breve você poderá gerar contratos de prestação de serviços e procurações
                diretamente por aqui.
              </p>
            </div>
          </TabsContent>
          <TabsContent value="arquivos" className="mt-0">
            <FilesTab neg={neg} reload={loadData} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
