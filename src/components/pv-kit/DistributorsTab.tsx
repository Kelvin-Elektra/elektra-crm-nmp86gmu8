import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export function DistributorsTab() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', cnpj: '' })

  const loadData = async () => {
    if (!user?.company_id) return
    const res = await pb.collection('pv_distributors').getFullList({
      filter: `company_id='${user.company_id}'`,
    })
    setData(res)
  }

  useEffect(() => {
    loadData()
  }, [user])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.company_id) return

    const exists = data.some((d) => d.name.toLowerCase() === form.name.toLowerCase())
    if (exists) {
      return toast({
        variant: 'destructive',
        title: `A distribuidora/concessionária ${form.name} já está cadastrada.`,
      })
    }

    setLoading(true)
    try {
      await pb.collection('pv_distributors').create({ ...form, company_id: user.company_id })
      toast({ title: 'Sucesso', description: 'Distribuidora adicionada.' })
      setForm({ name: '', cnpj: '' })
      loadData()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível adicionar.' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await pb.collection('pv_distributors').delete(id)
      loadData()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir.' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuidoras Homologadas</CardTitle>
        <CardDescription>Cadastre os fornecedores para vincular aos equipamentos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleAdd} className="flex gap-4 items-end bg-muted/30 p-4 rounded-lg">
          <div className="flex-1 space-y-2">
            <Label>Nome da Distribuidora</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="flex-1 space-y-2">
            <Label>CNPJ</Label>
            <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
          </div>
          <Button type="submit" disabled={loading}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar
          </Button>
        </form>

        <div className="rounded-md border">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 font-medium">Nome</th>
                <th className="p-3 font-medium">CNPJ</th>
                <th className="p-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="border-t">
                  <td className="p-3">{d.name}</td>
                  <td className="p-3">{d.cnpj || '-'}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-muted-foreground">
                    Nenhuma cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
