import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Sun, Loader2, ArrowLeft } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await pb.collection('users').requestPasswordReset(email)
      setSuccess(true)
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Não foi possível solicitar a redefinição de senha.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Sun className="h-10 w-10 text-secondary" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-secondary">Elektra CRM</h1>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle>Recuperar Senha</CardTitle>
            <CardDescription>
              Insira seu email para receber as instruções de redefinição.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4 animate-fade-in">
                <p className="text-sm text-muted-foreground">
                  Se o email estiver cadastrado, você receberá um link para redefinir sua senha em
                  instantes.
                </p>
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link to="/">Voltar para o Login</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Seu email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="transition-all focus:ring-primary"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full active:scale-[0.98] transition-transform"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? 'Enviando...' : 'Solicitar Redefinição'}
                </Button>
              </form>
            )}
          </CardContent>
          {!success && (
            <CardFooter className="justify-center border-t pt-4 pb-4">
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-2 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar para o login
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  )
}
