import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import pb from '@/lib/pocketbase/client'

export default function Portal() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [hubUrl, setHubUrl] = useState('')
  const [sysName, setSysName] = useState('Elektra CRM')
  const [logoUrl, setLogoUrl] = useState('')

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  useEffect(() => {
    pb.collection('system_settings')
      .getFirstListItem('')
      .then((record) => {
        if (record.system_name) setSysName(record.system_name)
        if (record.hub_url) setHubUrl(record.hub_url)
        if (record.logo) {
          setLogoUrl(pb.files.getURL(record, record.logo))
        }
      })
      .catch(() => {})
  }, [])

  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center border border-slate-100 animate-fade-in-up">
        {logoUrl ? (
          <img src={logoUrl} alt={sysName} className="h-16 mx-auto mb-6 object-contain" />
        ) : (
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-6">{sysName}</h1>
        )}

        <div className="space-y-4 mb-8">
          <p className="text-slate-600 text-lg font-medium">
            O acesso ao sistema agora é unificado.
          </p>
          <p className="text-slate-500">
            Para acessar sua conta, por favor faça login através do Elektra Hub.
          </p>
        </div>

        {hubUrl && (
          <Button asChild className="w-full text-base h-12" size="lg">
            <a href={hubUrl} target="_blank" rel="noopener noreferrer">
              Acessar via Elektra Hub
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </Button>
        )}
      </div>
    </div>
  )
}
