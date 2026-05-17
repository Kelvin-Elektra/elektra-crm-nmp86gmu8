import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter, Pencil, Trash2, Briefcase } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getLeads, deleteLead } from '@/services/db'
import { useRealtime } from '@/hooks/use-realtime'
import { LeadDialog } from '@/components/LeadDialog'
import { NewNegotiationDialog } from '@/components/NewNegotiationDialog'
import { useAuth } from '@/contexts/AuthContext'

export default function Leads() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [leadDialogOpen, setLeadDialogOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [newNegOpen, setNewNegOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    setIsLoading(true)
    try {
      const companyId = user?.role === 'User_elektra' ? undefined : user?.company_id
      const data = await getLeads(companyId)
      setLeads(data)
    } catch (err) {
      console.error('Error loading leads:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (user) load()
  }, [user])

  useRealtime('leads', () => {
    if (user) load()
  })

  const filtered = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || '').includes(search),
  )

  const handleEdit = (lead: any) => {
    setSelectedLead(lead)
    setLeadDialogOpen(true)
  }

  const handleNew = () => {
    setSelectedLead(null)
    setLeadDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      await deleteLead(id)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Leads</h2>
          <p className="text-muted-foreground">Gerencie seus potenciais clientes</p>
        </div>
        <Button onClick={handleNew} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Novo Lead
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4 border-b flex flex-row items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar leads..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-28" />
                    </TableCell>
                    <TableCell className="text-right flex justify-end gap-2">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    Nenhum lead encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.document || '-'}</TableCell>
                    <TableCell>{lead.email || '-'}</TableCell>
                    <TableCell>{lead.phone || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Nova Negociação"
                          onClick={() => {
                            setSelectedLead(lead)
                            setNewNegOpen(true)
                          }}
                        >
                          <Briefcase className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(lead)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(lead.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <LeadDialog open={leadDialogOpen} onOpenChange={setLeadDialogOpen} lead={selectedLead} />
      <NewNegotiationDialog
        open={newNegOpen}
        onOpenChange={setNewNegOpen}
        initialLeadId={selectedLead?.id}
      />
    </div>
  )
}
