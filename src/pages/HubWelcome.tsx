import { useState } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { getCachedSystemSettings } from '@/lib/pocketbase/settings'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, ShieldCheck, Briefcase } from 'lucide-react'

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
        <div className="w-full md:w-1/2 h-full backdrop-blur-md bg-background/40" />
      </div>

      <div className="relative z-10 w-full flex items-center justify-center md:justify-end md:pr-[10%] p-4">
        <Card className="w-full max-w-lg shadow-2xl border border-white/20 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
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

          <CardContent className="space-y-4">
            {/* Aviso amigável sobre o HUB */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Acesso unificado pelo Elektra HUB
                </p>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                O acesso ao Elektra CRM é centralizado pelo <strong>Elektra HUB</strong>. Localize o
                cartão <strong>Elektra CRM</strong> e clique em <em>"Acessar Módulo"</em> para
                entrar automaticamente.
              </p>

              <div className="pt-0.5">
                <Button asChild className="w-full shadow-sm font-medium gap-2" size="default">
                  <a href={hubUrl} target="_blank" rel="noopener noreferrer">
                    Ir para o Elektra HUB
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Ícone discreto de maleta para acesso administrativo */}
            <div className="flex items-center justify-end pt-1">
              <Link
                to="/elektra-admin"
                title="Área restrita"
                aria-label="Área restrita"
                className="text-muted-foreground/40 hover:text-muted-foreground/80 transition-colors p-1 rounded hover:bg-muted/30"
              >
                <Briefcase className="w-3.5 h-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
