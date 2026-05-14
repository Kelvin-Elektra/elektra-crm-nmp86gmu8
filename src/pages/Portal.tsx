import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import pb from '@/lib/pocketbase/client'
import { LogIn } from 'lucide-react'

const DEFAULT_LOGO_URL = 'https://img.usecurling.com/i?q=elektra&color=azure'

export default function Portal() {
  const [systemName, setSystemName] = useState('Elektra CRM')
  const [hubLogoUrl, setHubLogoUrl] = useState(DEFAULT_LOGO_URL)
  const [hubUrl, setHubUrl] = useState('https://hub.elektrasolucoes.tech/')
  const [hubDescription, setHubDescription] = useState(
    'Acesse o Hub para gerenciar sua conta e produtos Elektra.',
  )

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await pb.send('/backend/v1/public/system-settings', { method: 'GET' })
        if (res.system_name) setSystemName(res.system_name)
        if (res.hub_logoUrl) {
          setHubLogoUrl(`${pb.baseUrl}${res.hub_logoUrl}`)
        } else if (res.logoUrl) {
          setHubLogoUrl(`${pb.baseUrl}${res.logoUrl}`)
        }
        if (res.hub_url) setHubUrl(res.hub_url)
        if (res.hub_description) setHubDescription(res.hub_description)
      } catch (err) {
        console.error('Error fetching system settings:', err)
      }
    }
    fetchSettings()
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="flex flex-col items-center mb-8 text-center">
          {hubLogoUrl ? (
            <img
              src={hubLogoUrl}
              alt={systemName}
              className="h-24 object-contain mb-4 rounded-xl"
            />
          ) : (
            <h1 className="text-4xl font-black text-primary mb-4 tracking-tighter">{systemName}</h1>
          )}
          <p className="text-muted-foreground mt-2 font-medium max-w-[80%] mx-auto">
            {hubDescription}
          </p>
        </div>

        <Card className="border-border/50 shadow-xl overflow-hidden">
          <div className="bg-primary/5 p-6 flex flex-col items-center border-b border-border/50">
            <Button
              size="lg"
              className="w-full text-base font-semibold shadow-md transition-all hover:-translate-y-0.5"
              onClick={() => (window.location.href = hubUrl)}
            >
              <LogIn className="w-5 h-5 mr-2" />
              Acessar Elektra Hub
            </Button>
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Você será redirecionado para o portal do Hub para realizar o login seguro.
            </p>
          </div>
          <CardContent className="p-4 bg-card">
            <div className="flex items-center justify-center">
              <Link
                to="/loginmanual"
                className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors"
              >
                Acesso manual para administradores
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
