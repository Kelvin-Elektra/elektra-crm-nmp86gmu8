import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getNegotiation,
  updateNegotiation,
  getUsers,
  getProposalsByNeg,
  createProposal,
} from '@/services/db'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, User, FileText, Settings, Zap, Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function NegotiationDetail() {
  const { id } = useParams()
  const { toast } = useToast()
  const [negotiation, setNegotiation] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [proposals, setProposals] = useState<any[]>([])
  const [isPropModalOpen, setIsPropModalOpen] = useState(false)

  const [propForm, setPropForm] = useState({ description: '', kit_details: '', price: '' })

  const loadData = async () => {
    if (!id) return
    const neg = await getNegotiation(id)
    setNegotiation(neg)
    const allUsers = await getUsers()
    setUsers(allUsers.filter((u) => u.company_id === neg.company_id))
    setProposals(await getProposalsByNeg(id))
  }

  useEffect(() => {
    loadData()
  }, [id])
  useRealtime('negotiations', loadData)
  useRealtime('proposals', loadData)

  const handleUpdate = async (field: string, value: any) => {
    if (!id) return
    try {
      await updateNegotiation(id, { [field]: value })
      toast({ title: 'Sucesso', description: 'Atualizado com sucesso.' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    }
  }

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createProposal({
        company_id: negotiation.company_id,
        negotiation_id: id,
        description: propForm.description,
        kit_details: propForm.kit_details,
        price: Number(propForm.price),
        status: 'Gerada',
      })
      toast({ title: 'Sucesso', description: 'Proposta gerada.' })
      setIsPropModalOpen(false)
      setPropForm({ description: '', kit_details: '', price: '' })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    }
  }

  if (!negotiation)
    return <div className="p-8 text-center text-muted-foreground">Carregando...</div>

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/negociacoes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{negotiation.title}</h2>
          <p className="text-muted-foreground flex items-center gap-2">
            <User className="h-4 w-4" /> Cliente: {negotiation.expand?.lead_id?.name}
          </p>
        </div>
      </div>

      <Tabs defaultValue="dados" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="dados" className="flex items-center gap-2">
            <Settings className="h-4 w-4" /> Dados
          </TabsTrigger>
          <TabsTrigger value="propostas" className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Propostas
          </TabsTrigger>
          <TabsTrigger value="dimensionamento" className="flex items-center gap-2">
            <Zap className="h-4 w-4" /> Dimensionamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Comerciais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Responsável (Owner)</Label>
                <Select
                  value={negotiation.owner_id || 'unassigned'}
                  onValueChange={(val) =>
                    handleUpdate('owner_id', val === 'unassigned' ? null : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Não atribuído</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Consumo Médio (kWh)</Label>
                <Input
                  type="number"
                  defaultValue={negotiation.avg_consumption}
                  onBlur={(e) => handleUpdate('avg_consumption', Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Concessionária</Label>
                <Input
                  defaultValue={negotiation.concessionaire}
                  onBlur={(e) => handleUpdate('concessionaire', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Unidade Consumidora (UC)</Label>
                <Input
                  defaultValue={negotiation.uc}
                  onBlur={(e) => handleUpdate('uc', e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Endereço de Instalação</Label>
                <Input
                  defaultValue={negotiation.address}
                  onBlur={(e) => handleUpdate('address', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="propostas" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Propostas Comerciais</h3>
            <Dialog open={isPropModalOpen} onOpenChange={setIsPropModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Nova Proposta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gerar Nova Proposta</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProposal} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Descrição / Título</Label>
                    <Input
                      required
                      value={propForm.description}
                      onChange={(e) => setPropForm({ ...propForm, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Equipamentos (Kit Sugerido)</Label>
                    <Select onValueChange={(val) => setPropForm({ ...propForm, kit_details: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um kit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Kit Canadian 5kWp + Inversor Growatt">
                          Kit Canadian 5kWp + Inversor Growatt
                        </SelectItem>
                        <SelectItem value="Kit Jinko 8kWp + Microinversor Hoymiles">
                          Kit Jinko 8kWp + Microinversor Hoymiles
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Valor Total (R$)</Label>
                    <Input
                      required
                      type="number"
                      step="0.01"
                      value={propForm.price}
                      onChange={(e) => setPropForm({ ...propForm, price: e.target.value })}
                    />
                  </div>
                  <div className="pt-4 flex justify-end">
                    <Button type="submit">Gerar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4">
            {proposals.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">
                      {p.description || 'Proposta sem título'}
                    </p>
                    <p className="text-sm text-muted-foreground">{p.kit_details}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      R$ {p.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs uppercase bg-primary/10 text-primary px-2 py-1 rounded-full inline-block mt-1">
                      {p.status}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {proposals.length === 0 && (
              <p className="text-muted-foreground py-8 text-center">Nenhuma proposta gerada.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="dimensionamento" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Análise Técnica e Dimensionamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-6 bg-secondary/50 rounded-lg border border-dashed border-border flex flex-col items-center justify-center text-center space-y-4">
                <Zap className="h-12 w-12 text-primary/50" />
                <div>
                  <h4 className="font-semibold text-lg">Potência Sugerida: 5.4 kWp</h4>
                  <p className="text-muted-foreground max-w-md mx-auto mt-2">
                    Baseado no consumo médio de {negotiation.avg_consumption || 0} kWh, a geração
                    estimada requer um sistema de aproximadamente 5.4 kWp para abater 100% do
                    consumo.
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <div className="bg-background px-4 py-2 rounded-md shadow-sm border">
                    <span className="block text-xs text-muted-foreground">Geração Estimada</span>
                    <span className="font-bold">650 kWh/mês</span>
                  </div>
                  <div className="bg-background px-4 py-2 rounded-md shadow-sm border">
                    <span className="block text-xs text-muted-foreground">Área Necessária</span>
                    <span className="font-bold">~25 m²</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
