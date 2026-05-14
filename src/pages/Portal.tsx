import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { Link } from 'react-router-dom'
import { ArrowRight, LogIn } from 'lucide-react'

export default function Portal() {
  const [settings, setSettings] = useState({
    system_name: 'Elektra CRM',
    logoUrl: '',
    hub_logoUrl: '',
    hub_url: 'https://hub.elektrasolucoes.tech/',
    hub_description: 'Acesse o Hub para gerenciar sua conta e produtos Elektra.',
  })

  useEffect(() => {
    pb.send('/backend/v1/public/system-settings', { method: 'GET' })
      .then((res) => {
        if (res) {
          setSettings((prev) => ({
            ...prev,
            ...res,
            logoUrl: res.logoUrl ? `${pb.baseUrl}${res.logoUrl}` : '',
            hub_logoUrl: res.hub_logoUrl ? `${pb.baseUrl}${res.hub_logoUrl}` : '',
          }))
        }
      })
      .catch(console.error)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background"></div>

      <div className="z-10 w-full max-w-md animate-fade-in-up">
        <div className="flex flex-col items-center mb-8 text-center">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt={settings.system_name}
              className="h-20 object-contain mb-4"
            />
          ) : (
            <h1 className="text-4xl font-bold text-primary mb-4 tracking-tighter">
              {settings.system_name}
            </h1>
          )}
          <p className="text-muted-foreground text-lg">Bem-vindo ao CRM.</p>
        </div>

        <Card className="border-border/50 shadow-xl overflow-hidden backdrop-blur-sm bg-background/95">
          <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
            {settings.hub_logoUrl ? (
              <img src={settings.hub_logoUrl} alt="Hub Logo" className="h-12 object-contain" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                H
              </div>
            )}

            <p className="text-slate-600 font-medium">{settings.hub_description}</p>

            <a href={settings.hub_url} className="w-full">
              <Button size="lg" className="w-full text-base font-semibold group h-14">
                Acessar Elektra Hub
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </a>

            <div className="relative w-full py-2 flex items-center justify-center">
              <div className="absolute border-t w-full border-muted-foreground/20"></div>
              <span className="bg-background px-3 text-xs text-muted-foreground relative z-10">
                OU
              </span>
            </div>

            <Link to="/loginmanual" className="w-full text-center group">
              <Button variant="outline" className="w-full">
                <LogIn className="mr-2 h-4 w-4 opacity-70 group-hover:opacity-100" /> Acesso
                Administrativo (Manual)
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
