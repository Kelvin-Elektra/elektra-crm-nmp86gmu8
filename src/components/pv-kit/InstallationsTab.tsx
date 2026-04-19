import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'

export function InstallationsTab() {
  const { user } = useAuth()
  const [data, setData] = useState<any[]>([])
  const [form, setForm] = useState({ name: '', purlin_type: 'Terças de madeira' })

  const loadData = async () => {
    if (!user?.company_id) return
    const res = await pb.collection('pv_installations').getFullList()
    setData(res)
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id) return
    await pb.collection('pv_installations').create({ ...form, company_id: user.company_id })
    setForm({ name: '', purlin_type: 'Terças de madeira' })
    loadData()
  }

  const defaultNames = ['Aluzinco', 'Telha', 'Fibrocimento', 'Eternit', 'Solo', 'Carport']

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tipos de Instalação</CardTitle>
        <CardDescription>Defina os tipos de telhados ou solo para dimensionamento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleAdd}
          className="flex flex-col md:flex-row gap-4 items-end bg-muted/30 p-4 rounded-lg"
        >
          <div className="flex-1 space-y-2 w-full">
            <Label>Nome do Tipo</Label>
            <div className="flex gap-2">
              <Input
                required
                list="installations-names"
                placeholder="Ex: Cerâmica"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <datalist id="installations-names">
                {defaultNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="flex-1 space-y-2 w-full">
            <Label>Enterçamento</Label>
            <Select
              value={form.purlin_type}
              onValueChange={(v) => setForm({ ...form, purlin_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Terças de madeira">Terças de madeira</SelectItem>
                <SelectItem value="Terças de metal">Terças de metal</SelectItem>
                <SelectItem value="Solo">Solo</SelectItem>
                <SelectItem value="Irrelevante">Irrelevante</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </form>

        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">Enterçamento Base</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3 font-medium">{d.name}</td>
                  <td className="p-3">{d.purlin_type || '-'}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => pb.collection('pv_installations').delete(d.id).then(loadData)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
