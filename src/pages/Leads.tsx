import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

const leads = [
  {
    id: 1,
    name: 'Empresa Alpha Ltda',
    contact: 'Carlos Mendes',
    phone: '(11) 98888-7777',
    status: 'Novo',
    date: '14 Abr 2026',
  },
  {
    id: 2,
    name: 'Residência Silva',
    contact: 'Ana Silva',
    phone: '(21) 99999-8888',
    status: 'Em Atendimento',
    date: '12 Abr 2026',
  },
  {
    id: 3,
    name: 'Supermercado Bom Preço',
    contact: 'Roberto Nunes',
    phone: '(31) 97777-6666',
    status: 'Qualificado',
    date: '10 Abr 2026',
  },
  {
    id: 4,
    name: 'Clínica Sorriso',
    contact: 'Dra. Júlia',
    phone: '(41) 96666-5555',
    status: 'Novo',
    date: '09 Abr 2026',
  },
]

export default function Leads() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestão de Leads</h2>
          <p className="text-muted-foreground">Gerencie seus potenciais clientes</p>
        </div>
        <Button className="shrink-0">
          <Plus className="mr-2 h-4 w-4" /> Novo Lead
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4 border-b flex flex-row items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="search" placeholder="Buscar leads..." className="pl-8" />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome / Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Data Inclusão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.contact}</TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell>
                    <Badge
                      variant={lead.status === 'Novo' ? 'default' : 'secondary'}
                      className={lead.status === 'Novo' ? 'bg-primary text-primary-foreground' : ''}
                    >
                      {lead.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{lead.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
