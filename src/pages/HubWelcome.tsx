import { useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { getCachedSystemSettings } from '@/lib/pocketbase/settings'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, ShieldCheck } from 'lucide-react'

export default function HubWelcome() {
  const [settings] = useState<any>(getCachedSystemSettings())

  const bgUrl = settings?.login_background
    ? pb.files.getURL(settings, settings.login_background)
    : 'https://img.usecurling.com/p/2072/600?q=abstract'

  const logoUrl = settings?.logo ? pb.files.getURL(settings, settings.logo) : null
  const hubUrl = settings?.hub_url || 'https://hub.elektrasolucoes.tech'

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-background">
      {/* Background Image com overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${bgUrl})` }}
      />
      <div className="absolute inset-0 flex">
        <div className="w-full md:w-1/2 h-full hidden md:block backdrop-blur-xs bg-slate-950/40" />
        <div className="w-full md:w-1/2 h-full backdrop-blur-md bg-background/85" />
      </div>

      <div className="relative z-10 w-full flex items-center justify-center md:justify-end md:pr-[10%] p-4">
        <Card className="w-full max-w-lg shadow-2xl border-0 bg-card/95 backdrop-blur">
          <CardHeader className="space-y-4 text-center">
            {logoUrl && (
              <div className="flex justify-center mb-1">
                <img src={logoUrl} alt="Logo" className="h-16 object-contain" />
              </div>
            )}
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-bold tracking-tight">Elektra CRM</CardTitle>
              <CardDescription className="text-sm">
                Plataforma de Gestão Comercial e Dimensionamento Solar Fotovoltaico
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Aviso amigável sobre o HUB */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Acesso unificado através do HUB
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Para uma experiência mais segura e centralizada, o acesso ao Elektra CRM é feito
                    diretamente pelo <strong>HUB Elektra</strong> (portal do usuário).
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground pl-10 leading-relaxed">
                Basta entrar no HUB, localizar o cartão <strong>Elektra CRM</strong> e clicar em{' '}
                <em>"Acessar Módulo"</em> para ser autenticado automaticamente.
              </div>

              <div className="pt-1">
                <Button asChild className="w-full shadow-sm font-medium gap-2" size="lg">
                  <a href={hubUrl} target="_blank" rel="noopener noreferrer">
                    Ir para o HUB Elektra
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Links auxiliares */}
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-1">
              <Link
                to="/reset-password"
                className="hover:text-foreground hover:underline transition-colors"
              >
                Esqueceu sua senha?
              </Link>
              <span>•</span>
              <Link
                to="/elektra-admin"
                className="hover:text-foreground hover:underline transition-colors"
              >
                Acesso Administrativo
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
