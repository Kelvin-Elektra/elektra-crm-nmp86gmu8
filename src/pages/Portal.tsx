import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { getCachedSystemSettings } from '@/lib/pocketbase/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

const emailSchema = z.object({
  email: z.string().min(1, 'O e-mail é obrigatório.').email('E-mail inválido'),
})

const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'A senha é obrigatória'),
})

export default function Portal() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [settings] = useState<any>(getCachedSystemSettings())

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { email: '', password: '' },
  })

  const onEmailSubmit = (values: z.infer<typeof emailSchema>) => {
    passwordForm.setValue('email', values.email)
    setStep(2)
  }

  const onPasswordSubmit = async (values: z.infer<typeof passwordSchema>) => {
    setLoading(true)
    const result = await login(values.email, values.password)
    setLoading(false)
    if (!result.success) {
      toast({
        title: 'Erro no login',
        description: result.error || 'Verifique suas credenciais e tente novamente.',
        variant: 'destructive',
      })
    } else {
      navigate('/dashboard')
    }
  }

  const handleResendVerification = async () => {
    const email = passwordForm.getValues('email')
    if (!email) return
    try {
      setLoading(true)
      await pb.collection('users').requestVerification(email)
      toast({
        title: 'Sucesso!',
        description: 'Link de verificação reenviado para seu e-mail.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar link',
        description: err.response?.message || err.message || 'Tente novamente mais tarde.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const bgUrl = settings?.login_background
    ? pb.files.getURL(settings, settings.login_background)
    : 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?q=80&w=2072&auto=format&fit=crop'

  const logoUrl = settings?.logo ? pb.files.getURL(settings, settings.logo) : null

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-background">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />
      <div className="absolute inset-0 flex">
        <div className="w-1/2 h-full hidden md:block" />
        <div className="w-full md:w-1/2 h-full backdrop-blur-md bg-background/60" />
      </div>

      <div className="relative z-10 w-full flex items-center justify-center md:justify-end md:pr-[10%] p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-card/95 backdrop-blur">
          <CardHeader className="space-y-4">
            {logoUrl && (
              <div className="flex justify-center mb-2">
                <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
              </div>
            )}
            <CardTitle className="text-2xl text-center">Acesse sua conta</CardTitle>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl>
                          <Input placeholder="seu@email.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="lg">
                    Continuar
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                  <div className="flex items-center justify-between text-sm p-3 bg-muted rounded-md">
                    <span className="text-muted-foreground truncate mr-2 font-medium">
                      {passwordForm.getValues('email')}
                    </span>
                    <Button
                      variant="link"
                      className="p-0 h-auto font-semibold"
                      onClick={() => setStep(1)}
                      type="button"
                    >
                      Alterar
                    </Button>
                  </div>
                  <FormField
                    control={passwordForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>

                  <div className="flex flex-col space-y-2 mt-4 text-center">
                    <Button
                      variant="link"
                      size="sm"
                      type="button"
                      onClick={() => navigate('/reset-password')}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Esqueceu sua senha?
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      type="button"
                      onClick={handleResendVerification}
                      disabled={loading}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Reenviar link de autenticação
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
