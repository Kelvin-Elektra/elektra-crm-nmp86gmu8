import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { Building2, User } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie o perfil da empresa e preferências</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-2">
          <Button variant="secondary" className="w-full justify-start font-semibold">
            <User className="mr-2 h-4 w-4" /> Meu Perfil
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground">
            <Building2 className="mr-2 h-4 w-4" /> Dados da Empresa
          </Button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seus dados de acesso e perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input id="name" defaultValue={user?.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue={user?.email} disabled />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado por segurança.
                </p>
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <Label htmlFor="current_password">Senha Atual</Label>
                <Input id="current_password" type="password" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password">Nova Senha</Label>
                  <Input id="new_password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                  <Input id="confirm_password" type="password" />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button>Salvar Alterações</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
